import SwiftUI
import WebKit

struct LocalWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        // This is a preview shell for a bundled build: never serve a cached copy,
        // otherwise a rebuilt Web folder keeps rendering the previous assets.
        configuration.websiteDataStore = .nonPersistent()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.setURLSchemeHandler(
            context.coordinator.schemeHandler,
            forURLScheme: LocalAssetSchemeHandler.scheme
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .white
        webView.scrollView.backgroundColor = .white
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false

        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        guard let indexURL = URL(string: "\(LocalAssetSchemeHandler.scheme)://app/index.html") else {
            webView.loadHTMLString(
                "<h1 style='font-family:-apple-system;padding:24px'>Unable to load preview.</h1>",
                baseURL: nil
            )
            return webView
        }

        webView.load(
            URLRequest(
                url: indexURL,
                cachePolicy: .reloadIgnoringLocalAndRemoteCacheData
            )
        )
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator {
        let schemeHandler = LocalAssetSchemeHandler()
    }
}

final class LocalAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "denon-preview"

    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        guard
            let requestURL = urlSchemeTask.request.url,
            let resourceURL = bundledResourceURL(for: requestURL),
            let data = try? Data(contentsOf: resourceURL)
        else {
            urlSchemeTask.didFailWithError(
                NSError(
                    domain: NSURLErrorDomain,
                    code: NSURLErrorFileDoesNotExist,
                    userInfo: [NSLocalizedDescriptionKey: "Bundled preview resource was not found."]
                )
            )
            return
        }

        let response = URLResponse(
            url: requestURL,
            mimeType: mimeType(for: resourceURL.pathExtension),
            expectedContentLength: data.count,
            textEncodingName: isTextResource(resourceURL.pathExtension) ? "utf-8" : nil
        )

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}

    private func bundledResourceURL(for requestURL: URL) -> URL? {
        guard let resourceRoot = Bundle.main.resourceURL else {
            return nil
        }

        let webRoot = resourceRoot
            .appendingPathComponent("Web", isDirectory: true)
            .standardizedFileURL
        let relativePath = requestURL.path == "/"
            ? "index.html"
            : String(requestURL.path.dropFirst())
        let resourceURL = webRoot
            .appendingPathComponent(relativePath)
            .standardizedFileURL

        guard resourceURL.path.hasPrefix(webRoot.path + "/") else {
            return nil
        }

        return resourceURL
    }

    private func mimeType(for extensionName: String) -> String {
        switch extensionName.lowercased() {
        case "html":
            return "text/html"
        case "js":
            return "text/javascript"
        case "css":
            return "text/css"
        case "svg":
            return "image/svg+xml"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "mp4":
            return "video/mp4"
        default:
            return "application/octet-stream"
        }
    }

    private func isTextResource(_ extensionName: String) -> Bool {
        ["html", "js", "css", "svg"].contains(extensionName.lowercased())
    }
}
