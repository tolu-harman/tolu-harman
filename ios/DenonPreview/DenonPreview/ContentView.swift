import SwiftUI

struct ContentView: View {
    var body: some View {
        LocalWebView()
            .ignoresSafeArea()
            .statusBarHidden(true)
            .background(Color.white)
    }
}
