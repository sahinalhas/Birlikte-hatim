# 📿 Birlikte İbadet

Müslüman toplulukların toplu ibadet organizasyonlarını (hatim, salavat, yasin, tesbih) kolaylaştıran, sosyal özelliklerle zenginleştirilmiş mobil uygulama.

## 🚀 Özellikler

- **Hatim Grupları**: 30 cüz otomatik olarak oluşturulur, üyeler cüz seçer
- **Salavat Kampanyaları**: Hedef belirleme ve topluluk sayacı
- **Yasin Grupları**: Toplu Yasin okuma organizasyonu
- **Kişisel Tesbih Sayacı**: Günlük zikir takibi
- **Gerçek Zamanlı Güncellemeler**: Cüz tamamlama anında tüm üyelere bildirim
- **Sosyal Özellikler**: Reaksiyonlar, mesajlaşma
- **Gamification**: Rozetler ve seriler

## 🛠 Teknoloji Stack

- **React Native** + **Expo** (iOS ve Android)
- **Expo Router** - File-based routing
- **React Query** - Veri yönetimi ve caching
- **Supabase** - PostgreSQL veritabanı + Auth + Realtime

## 📦 Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Supabase Kurulumu

1. [supabase.com](https://supabase.com)'da ücretsiz hesap oluşturun
2. Yeni bir proje oluşturun
3. SQL Editor'a gidin ve `supabase/schema.sql` dosyasını çalıştırın
4. Project Settings → API bölümünden URL ve anon key'i alın

### 3. Environment Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın:

```bash
cp .env.example .env
```

Değerleri doldurun:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Uygulamayı Başlat

```bash
npm start
```

## 📱 Proje Yapısı

```
Birlikte-hatim/
├── app/                    # Expo Router sayfaları
│   ├── (tabs)/            # Tab navigasyonu
│   │   ├── index.tsx      # Ana sayfa (Gruplarım)
│   │   ├── discover.tsx   # Keşfet
│   │   ├── counter.tsx    # Tesbih sayacı
│   │   └── profile.tsx    # Profil
│   ├── auth.tsx           # Giriş/Kayıt ekranı
│   ├── create-group.tsx   # Grup oluşturma
│   └── group/[id].tsx     # Grup detayı
├── components/            # Paylaşılan bileşenler
├── constants/             # Sabitler (renkler, vs.)
├── contexts/              # React Context'ler
│   ├── AppContext.tsx     # Uygulama state'i
│   └── AuthContext.tsx    # Kimlik doğrulama
├── lib/                   # Yardımcı kütüphaneler
│   ├── supabase.ts        # Supabase client
│   ├── database.ts        # Veritabanı servisleri
│   └── hooks.ts           # Custom hooks
├── supabase/
│   └── schema.sql         # Veritabanı şeması
└── assets/                # Görseller ve fontlar
```

## 🗄 Veritabanı Şeması

Supabase PostgreSQL veritabanı aşağıdaki tabloları içerir:

- `users` - Kullanıcı profilleri
- `groups` - Hatim/Salavat/Yasin grupları
- `group_members` - Grup üyelikleri
- `juz_assignments` - Cüz atamaları (hatim için)
- `activities` - Aktivite akışı
- `contributions` - Salavat/Yasin katkıları
- `messages` - Grup mesajları
- `reactions` - Aktivite reaksiyonları
- `notifications` - Bildirimler
- `counters` - Kişisel tesbih sayaçları
- `user_badges` - Rozetler

## 🔐 Kimlik Doğrulama

Supabase Auth ile:
- 📱 Telefon + SMS OTP
- 📧 Email + Şifre
- 🍎 Apple Sign In (yakında)
- 🔵 Google Sign In (yakında)

## 🔄 Gerçek Zamanlı Özellikler

Supabase Realtime ile:
- Cüz tamamlandığında anında güncelleme
- Yeni aktiviteler anında görünür
- Salavat sayacı canlı güncelleme
- Mesajlaşma

## 📊 Row Level Security (RLS)

Tüm tablolarda RLS aktif:
- Kullanıcılar sadece kendi profillerini görebilir
- Grup üyeleri sadece kendi gruplarını görebilir
- Aktiviteler ve mesajlar grup üyelerine özel

## 🧪 Test

```bash
# Lint kontrolü
npm run lint

# Lint düzeltme
npm run lint:fix
```

## 🚢 Deployment

### Expo EAS Build

```bash
# iOS build
eas build --platform ios

# Android build
eas build --platform android
```

## 📝 Yapılacaklar

- [ ] Push Notifications (FCM)
- [ ] Sesli mesaj
- [ ] QR kod ile grup daveti
- [ ] Haftalık/aylık istatistikler
- [ ] Karanlık mod
- [ ] Çoklu dil desteği
- [ ] Rozetler ve başarılar
- [ ] Premium özellikler

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'feat: Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License

---

**Allah kabul eylesin 🤲**
