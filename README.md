# 🐁 Vocab Mice

**Sınıf içi İngilizce kelime oyunu** — akıllı tahta + öğretmen telefonu, gerçek zamanlı.

Ortaokul İngilizce dersi için sınıf içi, gerçek zamanlı bir yarışma. Sınıf iki gruba (A ve B) ayrılır.
Her grubun bir fare karakteri vardır ve amaçları yolun sonundaki kafeste hapsolmuş arkadaşlarını ve lezzetli peyniri kurtarmaktır.

Her turda aktif gruba bir kelime (görsel) gösterilir. Öğrenci kelimenin İngilizcesini söyler, öğretmen telefonundan "doğru / yanlış" olarak değerlendirir.
Doğru cevap fareyi bir adım ilerletir. Yanlış cevap verdiğinde ise pusuda bekleyen sinsi kedi ortaya çıkar, fareyi korkutur ve fare olduğu yerde kalır (puan kazanamaz). 
Yolun sonundaki kafese ulaşan ilk grup oyunu kazanır.

## Mimari (tamamen ücretsiz)

| Katman | Servis | Not |
|---|---|---|
| Hosting + API | **Vercel** (serverless) | Statik arayüz + sunucusuz fonksiyonlar |
| Veri + görseller | **MongoDB Atlas** (M0) | Oyunlar, oda durumu ve görseller (base64) |
| Senkron | **Polling** (~1.2 sn) | Tahta/telefon sunucuyu yoklar; ekstra servis yok |

## 1. Kurulum

```bash
npm install
export $(grep -v '^#' Vocab-Mice-atlas-credentials.env | xargs) && PORT=3001 npm run dev
```

## 2. Ortam Değişkenleri

`Vocab-Mice-atlas-credentials.env` içine MongoDB URI adresinizi girmelisiniz.

## 3. Akış

1. Öğretmen `/admin` panelinden yeni oyun açar, soru sayısı belirler ve kelime görsellerini yükler.
2. Oluşan oyun kodunu akıllı tahtada (`/board/KOD`) ve telefonunda (`/moderate/KOD`) açar.
3. Moderatör panelinden "Sıradaki Soruyu Göster" ile ekrana kelimeyi yansıtır.
4. Grup cevaplar, öğretmen "Doğru" veya "Yanlış" butonuna basar.
5. Kazanan çıkana kadar devam eder.
