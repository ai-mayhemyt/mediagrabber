using MediaBrowser.Model.Plugins;

namespace MediaGrabber.Jellyfin.Configuration;

/// <summary>
/// Persisted configuration for MediaGrabber - Jellyfin Edition.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Base URL of the MediaGrabber instance (e.g. http://127.0.0.1:3000).
    /// </summary>
    public string MediaGrabberUrl { get; set; } = "http://127.0.0.1:3000";

    /// <summary>
    /// Scoped MediaGrabber API key (mg_...) with download or admin scope.
    /// Required for the downloader to function.
    /// </summary>
    public string MediaGrabberApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Default download mode: "video" or "audio".
    /// </summary>
    public string DefaultMode { get; set; } = "video";

    /// <summary>
    /// Automatically refresh Jellyfin libraries after jobs are queued/completed.
    /// </summary>
    public bool AutoRefreshLibrary { get; set; } = true;
}
