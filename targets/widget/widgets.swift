import WidgetKit
import SwiftUI

// MARK: - Shared data (App Group)

private enum AppGroupStore {
    /// Phải trùng `extra.appGroup` / entitlements trong app.config.js
    static let suiteName = "group.com.giaphaos.family"

    static var defaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    static var siteName: String {
        defaults.string(forKey: "siteName") ?? "Gia Phả OS"
    }

    static var memberCount: Int {
        if defaults.object(forKey: "memberCount") != nil {
            return defaults.integer(forKey: "memberCount")
        }
        return 0
    }

    static var updatedAt: String {
        defaults.string(forKey: "updatedAt") ?? ""
    }

    static var events: [WidgetEvent] {
        guard let raw = defaults.string(forKey: "eventsJson"),
              let data = raw.data(using: .utf8),
              let list = try? JSONDecoder().decode([WidgetEvent].self, from: data)
        else { return [] }
        return list
    }
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
            updatedAt: ""
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let entry = loadEntry()
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadEntry() -> SimpleEntry {
        SimpleEntry(
            date: Date(),
            siteName: AppGroupStore.siteName,
            memberCount: AppGroupStore.memberCount,
            events: AppGroupStore.events,
            updatedAt: AppGroupStore.updatedAt
        )
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
                Text(entry.memberCount > 0 ? "\(entry.memberCount) thành viên" : "Chưa có sự kiện")
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                Text("Mở app để đồng bộ")
                    .font(.caption2)
                    .foregroundColor(Color(red: 0.66, green: 0.64, blue: 0.62))
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
                Text("Không có sự kiện trong 7 ngày tới")
                    .font(.caption)
                    .foregroundColor(Color(red: 0.47, green: 0.44, blue: 0.42))
                Text("Mở app Gia Phả để đồng bộ widget")
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
                Text("Mở app Gia Phả một lần để đồng bộ dữ liệu widget.")
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
