# 🐁 Vocab Mice

**Sınıf içi İngilizce kelime oyunu** — akıllı tahta + öğretmen telefonu, gerçek zamanlı.

Ortaokul İngilizce dersleri için tasarlanmış, sınıf içi ve gerçek zamanlı interaktif bir yarışma uygulamasıdır. Sınıf iki gruba (A ve B) ayrılır.
Her grubun bir fare karakteri vardır ve amaçları yoldaki peynirleri toplayarak, yolun sonundaki kafeste hapsolmuş arkadaşlarını kurtarmaktır.

## 🎯 Temel Oyun Dinamikleri
- **Kıvrımlı Yollar:** Fareler dümdüz gitmek yerine, süzülen adımlarla sinüs dalgası şeklinde kıvrımlı yollardan ilerler.
- **Peynir Toplama:** Doğru cevap veren fare, yol üzerindeki durağına (peynire) ulaşır. Peyniri yediğinde keyifli konuşma balonları ("Yummy!", "Tasty!", "Delish!") çıkar.
- **Kedi - Fare Kovalamacası:** Yanlış cevap verildiğinde grubun faresi geriye düşmez, olduğu yerde kalır. Ancak ekranda heyecanlı bir kovalamaca başlar! Sinsi bir kara kedi (🐈‍⬛) belirir. Faremiz geriye doğru kaçar, havada ninja taklası atarak kediden kurtulur ve yerine sağ salim döner. Bu sırada kilitli fare korkudan "Help me!!" diye bağırır.
- **Büyük Buluşma (Oyun Sonu):** Yolun sonuna ulaşıldığında kafesin parmaklıkları kalkar ve kilit açılır. Kurtarılan arkadaş kafesten çıkar, iki fare yüz yüze gelir, aralarında bir "❤️" belirir ve sevinçten zıplamaya başlarlar!

## 🛠️ Mimari (Tamamen Ücretsiz)

| Katman | Servis | Not |
|---|---|---|
| Hosting + API | **Vercel** (serverless) | Statik arayüz + sunucusuz Node.js fonksiyonları |
| Veri + görseller | **MongoDB Atlas** (M0) | Oyun durumları, puanlar ve görseller (base64) |
| Senkronizasyon | **Polling** (~1.2 sn) | Tahta ve telefon sunucuyu düzenli yoklar; WebSocket/Socket.io gibi ekstra sunucu yükü gerektirmez |

## 🚀 1. Kurulum

```bash
npm install
export $(grep -v '^#' Vocab-Mice-atlas-credentials.env | xargs) && PORT=3001 npm run dev
```

## 🔐 2. Ortam Değişkenleri

Uygulamanın çalışması için `Vocab-Mice-atlas-credentials.env` dosyası (veya canlıya alırken Vercel Environment Variables) içine MongoDB bağlantı adresinizi girmelisiniz.

## 🕹️ 3. İşleyiş ve Akış

1. **Yönetim Paneli (`/admin`):** Öğretmen yeni bir oyun oluşturur. Soru sayısı girmek yerine doğrudan kullanılacak kelime görsellerini galeriden **toplu olarak (çoklu seçimle)** işaretler (veya yeni görseller yükler). Soru havuzu otomatik belirlenir.
2. **Akıllı Tahta (`/board/KOD`):** Öğrencilerin oyunu izleyeceği, yarışma animasyonlarının gösterildiği ana ekrandır.
3. **Moderatör (`/moderate/KOD`):** Öğretmenin kendi telefonundan gizlice soruları ve skorları yönettiği kontrol panelidir.
4. **Soru Sorma:** Moderatör panelinden "Sıradaki Soruyu Göster" ile ekrana seçili havuzdan rastgele bir kelime görseli yansıtılır.
5. **Puanlama:** Sırası gelen grup kelimeyi söyler; öğretmen "Doğru" veya "Yanlış" butonuna basar ve şov (animasyonlar) başlar! Kazanan çıkana kadar süreç devam eder.
