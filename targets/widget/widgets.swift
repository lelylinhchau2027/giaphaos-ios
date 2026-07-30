import WidgetKit
import SwiftUI

// MARK: - Data source (Supabase REST — no App Group)
//
// ESign (Apple ID cá nhân) không cấp được App Group entitlement, nên app
// và widget không thể chia sẻ dữ liệu qua UserDefaults(suiteName:)/File
// container nữa. Thay vào đó widget tự gọi thẳng Supabase REST API bằng
// SupabaseURL/SupabaseAnonKey nhúng sẵn lúc build (đọc qua Info.plist),
// đọc snapshot đã tính sẵn (member_count/events_json) từ bảng
// `widget_cache` mà app ghi mỗi lần đồng bộ. Xem docs/migrations/
// 2026-07-30_widget_cache.sql.

private enum SupabaseConfig {
    static var url: String {
        (Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String) ?? ""
    }
    static var anonKey: String {
        (Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String) ?? ""
    }
    static var isConfigured: Bool {
        !url.isEmpty && !anonKey.isEmpty && url.hasPrefix("http") && anonKey.count > 20
    }
}

private struct WidgetCacheRow: Decodable {
    let site_name: String?
    let member_count: Int?
    let events_json: String?
    let updated_at: String?
}

private struct WidgetFetchError: Error {
    let message: String
}

private func decodeEvents(_ data: Data) -> [WidgetEvent]? {
    // Flexible decoder: tolerate missing optionals / extra fields
    if let list = try? JSONDecoder().decode([WidgetEvent].self, from: data) {
        return list
    }
    // Sometimes wrapped or pretty-printed with unexpected types (daysUntil as Double)
    guard let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return nil
    }
    return arr.compactMap { WidgetEvent(dict: $0) }
}

private func fetchWidgetCache(completion: @escaping (Result<WidgetCacheRow, WidgetFetchError>) -> Void) {
    guard SupabaseConfig.isConfigured, let base = URL(string: SupabaseConfig.url) else {
        completion(.failure(WidgetFetchError(message: "Chưa cấu hình Supabase lúc build widget")))
        return
    }
    guard var comps = URLComponents(url: base.appendingPathComponent("rest/v1/widget_cache"), resolvingAgainstBaseURL: false) else {
        completion(.failure(WidgetFetchError(message: "Supabase URL không hợp lệ")))
        return
    }
    comps.queryItems = [
        URLQueryItem(name: "id", value: "eq.default"),
        URLQueryItem(name: "select", value: "site_name,member_count,events_json,updated_at"),
        URLQueryItem(name: "limit", value: "1"),
    ]
    guard let url = comps.url else {
        completion(.failure(WidgetFetchError(message: "Supabase URL không hợp lệ")))
        return
    }
    var req = URLRequest(url: url)
    req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
    req.setValue("Bearer \(SupabaseConfig.anonKey)", forHTTPHeaderField: "Authorization")
    req.timeoutInterval = 15

    URLSession.shared.dataTask(with: req) { data, response, error in
        if let error = error {
            completion(.failure(WidgetFetchError(message: "Lỗi mạng: \(error.localizedDescription)")))
            return
        }
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            completion(.failure(WidgetFetchError(message: "Supabase lỗi (HTTP \(http.statusCode)) — kiểm tra bảng widget_cache/RLS")))
            return
        }
        guard let data = data else {
            completion(.failure(WidgetFetchError(message: "Không có dữ liệu trả về")))
            return
        }
        guard let rows = try? JSONDecoder().decode([WidgetCacheRow].self, from: data), let row = rows.first else {
            completion(.failure(WidgetFetchError(message: "Mở app Gia Phả một lần để đồng bộ widget")))
            return
        }
        completion(.success(row))
    }.resume()
}

struct WidgetEvent: Codable, Identifiable, Hashable {
    let id: String
    let personId: String?
    let personName: String
    let type: String
    let date: String
    let eventDateLabel: String
    let daysUntil: Int
    let originYear: Int?

    init(
        id: String,
        personId: String?,
        personName: String,
        type: String,
        date: String,
        eventDateLabel: String,
        daysUntil: Int,
        originYear: Int?
    ) {
        self.id = id
        self.personId = personId
        self.personName = personName
        self.type = type
        self.date = date
        self.eventDateLabel = eventDateLabel
        self.daysUntil = daysUntil
        self.originYear = originYear
    }

    init?(dict: [String: Any]) {
        guard let personName = dict["personName"] as? String else { return nil }
        let id = (dict["id"] as? String)
            ?? (dict["id"] as? NSNumber)?.stringValue
            ?? UUID().uuidString
        self.id = id
        self.personId = dict["personId"] as? String
        self.personName = personName
        self.type = (dict["type"] as? String) ?? "custom"
        self.date = (dict["date"] as? String) ?? ""
        self.eventDateLabel = (dict["eventDateLabel"] as? String) ?? ""
        if let d = dict["daysUntil"] as? Int {
            self.daysUntil = d
        } else if let d = dict["daysUntil"] as? Double {
            self.daysUntil = Int(d)
        } else if let n = dict["daysUntil"] as? NSNumber {
            self.daysUntil = n.intValue
        } else {
            self.daysUntil = 0
        }
        if let y = dict["originYear"] as? Int {
            self.originYear = y
        } else if let y = dict["originYear"] as? Double {
            self.originYear = Int(y)
        } else if let n = dict["originYear"] as? NSNumber {
            self.originYear = n.intValue
        } else {
            self.originYear = nil
        }
    }

    var typeLabel: String {
        switch type {
        case "birthday": return "Sinh nhật"
        case "death_anniversary": return "Giỗ"
        case "custom": return "Sự kiện"
        default: return "Sự kiện"
        }
    }

    var emoji: String {
        switch type {
        case "birthday": return "🎂"
        case "death_anniversary": return "🕯️"
        default: return "📅"
        }
    }

    var whenText: String {
        if daysUntil == 0 { return "Hôm nay" }
        if daysUntil == 1 { return "Ngày mai" }
        if daysUntil < 0 { return "Đã qua" }
        if daysUntil <= 30 { return "Còn \(daysUntil) ngày" }
        return "Còn \(daysUntil) ngày"
    }
}

// MARK: - Timeline

struct SimpleEntry: TimelineEntry {
    let date: Date
    let siteName: String
    let memberCount: Int
    let events: [WidgetEvent]
    let updatedAt: String
    let windowDays: Int
    let statusNote: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(
            date: Date(),
            siteName: "Gia Phả OS",
            memberCount: 12,
            events: [
                WidgetEvent(
                    id: "1",
                    personId: nil,
                    personName: "Nguyễn Văn A",
                    type: "birthday",
                    date: "2026-07-26",
                    eventDateLabel: "26/07",
                    daysUntil: 1,
                    originYear: 1950
                )
            ],
            updatedAt: "",
            windowDays: 45,
            statusNote: ""
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        loadEntry(completion: completion)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        loadEntry { entry in
            // Refresh more often so new events appear sooner
            let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())
                ?? Date().addingTimeInterval(1800)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func loadEntry(completion: @escaping (SimpleEntry) -> Void) {
        fetchWidgetCache { result in
            switch result {
            case .success(let row):
                let events = (row.events_json ?? "[]").data(using: .utf8).flatMap(decodeEvents) ?? []
                let memberCount = row.member_count ?? 0
                let note = events.isEmpty
                    ? "Chưa có sự kiện sắp tới — thêm ngày sinh/sự kiện trong app"
                    : ""
                completion(SimpleEntry(
                    date: Date(),
                    siteName: row.site_name ?? "Gia Phả OS",
                    memberCount: memberCount,
                    events: events,
                    updatedAt: row.updated_at ?? "",
                    windowDays: 45,
                    statusNote: note
                ))
            case .failure(let err):
                completion(SimpleEntry(
                    date: Date(),
                    siteName: "Gia Phả OS",
                    memberCount: 0,
                    events: [],
                    updatedAt: "",
                    windowDays: 45,
                    statusNote: err.message
                ))
            }
        }
    }
}

// MARK: - Views

struct GiaPhaWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            LargeWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    let entry: SimpleEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text("🌳")
                Text(entry.siteName)
                    .font(.caption.weight(.bold))
                    .lineLimit(1)
                    .foregroundColor(Color(red: 0.16, green: 0.14, blue: 0.13))
            }

            if let next = entry.events.first {
                Spacer(minLength: 0)
                Text(next.emoji + " " + next.personName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(Color(red: 0.16, green: 0.14, blue: 0.13))
                    .lineLimit(2)
                Text(next.whenText)
                    .font(.caption.weight(.medium))
                    .foregroundColor(Color(red: 0.85, green: 0.47, blue: 0.02))
                Text(next.typeLabel + " · " + next.eventDateLabel)
                    .font(.caption2)
                    .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
            } else {
                Spacer(minLength: 0)
                if entry.memberCount > 0 {
                    Text("\(entry.memberCount) thành viên")
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                }
                Text(entry.statusNote.isEmpty ? "Chưa có sự kiện" : entry.statusNote)
                    .font(.caption2)
                    .foregroundColor(Color(red: 0.66, green: 0.64, blue: 0.62))
                    .lineLimit(3)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(4)
    }
}

struct MediumWidgetView: View {
    let entry: SimpleEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("🌳 \(entry.siteName)")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(Color(red: 0.16, green: 0.14, blue: 0.13))
                    .lineLimit(1)
                Spacer()
                Text("\(entry.memberCount) TV")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(red: 0.99, green: 0.93, blue: 0.8))
                    .foregroundColor(Color(red: 0.57, green: 0.25, blue: 0.05))
                    .clipShape(Capsule())
            }

            if entry.events.isEmpty {
                Text(entry.statusNote.isEmpty
                     ? "Chưa có sự kiện sắp tới"
                     : entry.statusNote)
                    .font(.caption)
                    .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                    .lineLimit(3)
                Text("Tab Lịch → thêm sự kiện · Cài đặt → Đồng bộ widget")
                    .font(.caption2)
                    .foregroundColor(Color(red: 0.66, green: 0.64, blue: 0.62))
                Spacer()
            } else {
                ForEach(entry.events.prefix(3)) { event in
                    HStack(spacing: 8) {
                        Text(event.emoji)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(event.personName)
                                .font(.caption.weight(.semibold))
                                .lineLimit(1)
                            Text("\(event.typeLabel) · \(event.eventDateLabel)")
                                .font(.caption2)
                                .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                        }
                        Spacer()
                        Text(event.whenText)
                            .font(.caption2.weight(.bold))
                            .foregroundColor(Color(red: 0.85, green: 0.47, blue: 0.02))
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(4)
    }
}

struct LargeWidgetView: View {
    let entry: SimpleEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.siteName)
                        .font(.headline.weight(.bold))
                    Text("Sự kiện sắp tới")
                        .font(.caption)
                        .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("\(entry.memberCount)")
                        .font(.title2.weight(.bold))
                        .foregroundColor(Color(red: 0.85, green: 0.47, blue: 0.02))
                    Text("thành viên")
                        .font(.caption2)
                        .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                }
            }

            Divider()

            if entry.events.isEmpty {
                Spacer()
                Text(entry.statusNote.isEmpty
                     ? "Mở app Gia Phả để đồng bộ widget."
                     : entry.statusNote)
                    .font(.caption)
                    .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                Spacer()
            } else {
                ForEach(entry.events.prefix(6)) { event in
                    HStack(spacing: 10) {
                        Text(event.emoji)
                            .font(.title3)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(event.personName)
                                .font(.subheadline.weight(.semibold))
                                .lineLimit(1)
                            Text("\(event.typeLabel) · \(event.eventDateLabel)")
                                .font(.caption)
                                .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                        }
                        Spacer()
                        Text(event.whenText)
                            .font(.caption.weight(.bold))
                            .foregroundColor(Color(red: 0.85, green: 0.47, blue: 0.02))
                    }
                    .padding(.vertical, 2)
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(4)
    }
}

// MARK: - Widget

struct GiaPhaWidget: Widget {
    let kind: String = "GiaPhaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            GiaPhaWidgetEntryView(entry: entry)
                .widgetBackground(
                    Color(red: 0.98, green: 0.98, blue: 0.97)
                )
        }
        .configurationDisplayName("Gia Phả")
        .description("Sự kiện sinh nhật, giỗ và lịch gia đình.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { color }
        } else {
            self.background(color)
        }
    }
}
