using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MediaGrabber.Jellyfin.Api;

[ApiController]
[Route("MediaGrabber")]
[Produces(MediaTypeNames.Application.Json)]
public class MediaGrabberPluginController : ControllerBase
{
    private static readonly HttpClient SharedHttp = new()
    {
        Timeout = TimeSpan.FromSeconds(20)
    };

    private static string NormalizeBaseUrl(string? rawUrl)
    {
        var cleaned = (rawUrl ?? string.Empty).Trim().TrimEnd('/');
        if (!Uri.TryCreate(cleaned, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("MediaGrabber Server URL must start with http:// or https://.");
        }
        return cleaned;
    }

    private static (string BaseUrl, string ApiKey) RequireConfiguredCredentials()
    {
        var cfg = Plugin.Instance?.Configuration
            ?? throw new InvalidOperationException("MediaGrabber plugin is not initialized.");
        var baseUrl = NormalizeBaseUrl(cfg.MediaGrabberUrl);
        var apiKey = (cfg.MediaGrabberApiKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new ArgumentException(
                "MediaGrabber API Key is required. Open Dashboard -> Plugins -> MediaGrabber to enter your API key.");
        }
        return (baseUrl, apiKey);
    }

    private async Task<IActionResult> ProxyJsonAsync(
        HttpMethod method,
        string baseUrl,
        string apiKey,
        string relativePath,
        object? body,
        CancellationToken cancellationToken)
    {
        using var req = new HttpRequestMessage(method, $"{baseUrl}{relativePath}");
        req.Headers.Add("X-API-Key", apiKey);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        if (body is not null)
        {
            var json = JsonSerializer.Serialize(body);
            req.Content = new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json);
        }

        using var resp = await SharedHttp.SendAsync(req, cancellationToken).ConfigureAwait(false);
        var payload = await resp.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        return new ContentResult
        {
            StatusCode = (int)resp.StatusCode,
            ContentType = MediaTypeNames.Application.Json,
            Content = string.IsNullOrWhiteSpace(payload) ? "{}" : payload
        };
    }

    /// <summary>
    /// Serves the embedded MediaGrabber plugin logo image.
    /// </summary>
    [HttpGet("Logo")]
    [AllowAnonymous]
    [Produces("image/png")]
    public IActionResult GetLogo()
    {
        var assembly = typeof(Plugin).Assembly;
        var resourceName = $"{typeof(Plugin).Namespace}.Web.logo.png";
        var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }
        return File(stream, "image/png");
    }

    /// <summary>
    /// Verifies configured MediaGrabber URL and API key.
    /// </summary>
    [HttpGet("Status")]
    [Authorize]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        try
        {
            var (baseUrl, apiKey) = RequireConfiguredCredentials();
            return await ProxyJsonAsync(HttpMethod.Get, baseUrl, apiKey, "/api/jellyfin/verify", null, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { ok = false, configured = false, error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { ok = false, error = ex.Message });
        }
    }

    /// <summary>
    /// Admin-only connection test before saving plugin settings.
    /// </summary>
    [HttpPost("TestConnection")]
    [Authorize(Policy = "RequiresElevation")]
    public async Task<IActionResult> TestConnection(
        [FromBody] TestConnectionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var baseUrl = NormalizeBaseUrl(request.MediaGrabberUrl);
            var apiKey = (request.MediaGrabberApiKey ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return BadRequest(new { ok = false, error = "MediaGrabber API Key is required." });
            }
            return await ProxyJsonAsync(HttpMethod.Get, baseUrl, apiKey, "/api/jellyfin/verify", null, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { ok = false, error = ex.Message });
        }
    }

    /// <summary>
    /// Queues one or more media URLs into MediaGrabber using the configured API key.
    /// </summary>
    [HttpPost("Grab")]
    [Authorize]
    public async Task<IActionResult> Grab(
        [FromBody] GrabRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (baseUrl, apiKey) = RequireConfiguredCredentials();
            var defaultMode = Plugin.Instance?.Configuration.DefaultMode == "audio" ? "audio" : "video";
            var mode = request.Mode == "audio" ? "audio" : request.Mode == "video" ? "video" : defaultMode;

            var urls = new List<string>();
            if (request.Urls is not null)
            {
                foreach (var u in request.Urls)
                {
                    var trimmed = (u ?? string.Empty).Trim();
                    if (!string.IsNullOrEmpty(trimmed)) urls.Add(trimmed);
                }
            }
            if (!string.IsNullOrWhiteSpace(request.Url))
            {
                foreach (var line in request.Url.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    var trimmed = line.Trim();
                    if (!string.IsNullOrEmpty(trimmed)) urls.Add(trimmed);
                }
            }

            if (urls.Count == 0)
            {
                return BadRequest(new { error = "Provide at least one valid media URL." });
            }

            return await ProxyJsonAsync(
                HttpMethod.Post,
                baseUrl,
                apiKey,
                "/api/jellyfin/grab",
                new { urls, mode },
                cancellationToken).ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode((int)HttpStatusCode.BadGateway, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Fetches active and recent downloads from MediaGrabber.
    /// </summary>
    [HttpGet("Queue")]
    [Authorize]
    public async Task<IActionResult> GetQueue(CancellationToken cancellationToken)
    {
        try
        {
            var (baseUrl, apiKey) = RequireConfiguredCredentials();
            return await ProxyJsonAsync(HttpMethod.Get, baseUrl, apiKey, "/api/jellyfin/queue", null, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Cancels a running or queued MediaGrabber job.
    /// </summary>
    [HttpPost("Cancel/{jobId}")]
    [Authorize]
    public async Task<IActionResult> CancelJob([FromRoute] string jobId, CancellationToken cancellationToken)
    {
        try
        {
            var (baseUrl, apiKey) = RequireConfiguredCredentials();
            return await ProxyJsonAsync(
                HttpMethod.Post,
                baseUrl,
                apiKey,
                $"/api/jellyfin/cancel/{Uri.EscapeDataString(jobId)}",
                null,
                cancellationToken).ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Retries a failed or completed MediaGrabber job.
    /// </summary>
    [HttpPost("Retry/{jobId}")]
    [Authorize]
    public async Task<IActionResult> RetryJob([FromRoute] string jobId, CancellationToken cancellationToken)
    {
        try
        {
            var (baseUrl, apiKey) = RequireConfiguredCredentials();
            return await ProxyJsonAsync(
                HttpMethod.Post,
                baseUrl,
                apiKey,
                $"/api/jellyfin/retry/{Uri.EscapeDataString(jobId)}",
                null,
                cancellationToken).ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }
}

public class TestConnectionRequest
{
    [JsonPropertyName("mediaGrabberUrl")]
    public string? MediaGrabberUrl { get; set; }

    [JsonPropertyName("mediaGrabberApiKey")]
    public string? MediaGrabberApiKey { get; set; }
}

public class GrabRequest
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("urls")]
    public List<string>? Urls { get; set; }

    [JsonPropertyName("mode")]
    public string? Mode { get; set; }
}
