using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using MediaGrabber.Jellyfin.Configuration;

namespace MediaGrabber.Jellyfin;

/// <summary>
/// MediaGrabber - Jellyfin Edition entry point.
/// Compatible with Jellyfin 10.8, 10.9, 10.10, and 10.11+.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static readonly Guid PluginGuid = new("c7f3a1e4-9b2d-4c6f-a810-4e92d3b17c50");

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "MediaGrabber";

    public override Guid Id => PluginGuid;

    public override string Description =>
        "MediaGrabber - Jellyfin Edition connects Jellyfin to your MediaGrabber server so you can queue YouTube, YouTube Music, Spotify, Instagram, and TikTok downloads, track progress, and manage jobs directly inside Jellyfin using a required MediaGrabber API key.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        var ns = GetType().Namespace;
        return new[]
        {
            new PluginPageInfo
            {
                Name = Name,
                DisplayName = "MediaGrabber Settings",
                EmbeddedResourcePath = $"{ns}.Web.configPage.html"
            },
            new PluginPageInfo
            {
                Name = "MediaGrabberDownloader",
                DisplayName = "MediaGrabber Downloader",
                EnableInMainMenu = true,
                MenuSection = "server",
                MenuIcon = "cloud_download",
                EmbeddedResourcePath = $"{ns}.Web.downloaderPage.html"
            }
        };
    }
}
