import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { WEB_URL } from "../config";

type Props = {
  path?: string | null;
  onReady?: () => void;
};

/**
 * WebView full-screen load bản web — UI/UX giống 100% bản Vercel.
 * Tối ưu cảm giác native: tắt bounce xung đột pan-zoom cây, safe area, spinner.
 */
export default function WebApp({ path, onReady }: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const uri = path
    ? `${WEB_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
    : WEB_URL;

  const onNav = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Không tải được Gia Phả</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Text style={styles.errorHint}>URL: {uri}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            setError(null);
            setLoading(true);
            webRef.current?.reload();
          }}
        >
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#B45309" />
          <Text style={styles.loadingText}>Đang mở Gia Phả…</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.max(8, Math.round(progress * 100))}%` },
              ]}
            />
          </View>
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri }}
        style={styles.webview}
        // —— mượt / native feel ——
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        // Tắt bounce để không “giật” khi pan/zoom cây gia phả
        bounces={false}
        overScrollMode="never"
        // iOS: giảm delay click 300ms
        decelerationRate="normal"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets={false}
        // Pull-to-refresh (iOS)
        pullToRefreshEnabled={Platform.OS === "ios"}
        // User agent nhẹ để server nhận diện app (tuỳ chọn)
        applicationNameForUserAgent="GiaPhaOS-iOS"
        onLoadProgress={({ nativeEvent }) => {
          setProgress(nativeEvent.progress);
        }}
        onLoadStart={() => {
          setLoading(true);
          setError(null);
        }}
        onLoadEnd={() => {
          setLoading(false);
          onReady?.();
        }}
        onError={(e) => {
          setLoading(false);
          setError(e.nativeEvent.description || "Lỗi mạng");
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) {
            setError(`Máy chủ lỗi ${e.nativeEvent.statusCode}`);
          }
        }}
        onNavigationStateChange={onNav}
        // Chặn mở link ngoài browser hệ thống (giữ trong app)
        setSupportMultipleWindows={false}
        // Inject CSS nhỏ: chặn overscroll rubber-band trên body
        injectedJavaScriptBeforeContentLoaded={`
          (function() {
            try {
              var s = document.createElement('style');
              s.innerHTML = 'html,body{overscroll-behavior:none;-webkit-tap-highlight-color:transparent;}';
              document.documentElement.appendChild(s);
            } catch (e) {}
            true;
          })();
        `}
      />

      {/* Nút back native khi WebView có history (tuỳ chọn, ẩn khi root) */}
      {canGoBack && !loading && (
        <Pressable
          style={styles.backFab}
          onPress={() => webRef.current?.goBack()}
          hitSlop={12}
        >
          <Text style={styles.backFabText}>‹</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fafaf9",
  },
  webview: {
    flex: 1,
    backgroundColor: "#fafaf9",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: "#fafaf9",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#57534e",
    fontSize: 15,
    fontWeight: "600",
  },
  progressTrack: {
    width: 160,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e7e5e4",
    overflow: "hidden",
    marginTop: 4,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#d97706",
    borderRadius: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fafaf9",
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1917",
  },
  errorBody: {
    fontSize: 14,
    color: "#78716c",
    textAlign: "center",
  },
  errorHint: {
    fontSize: 12,
    color: "#a8a29e",
    textAlign: "center",
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#1c1917",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
  },
  backFab: {
    position: "absolute",
    left: 12,
    bottom: 28,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(28,25,23,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  backFabText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 30,
    marginTop: -2,
  },
});
