/* =========================================================
   curriculumData.js — Müfredat konu tohum listeleri
   (9-12. Sınıf, TYT/AYT, Üniversite, Maarif 1./2. Aşama)
   ========================================================= */

export const CURRICULUM_SEED = {
  /* ---------------- Eski Müfredat: Lise ---------------- */
  "9. Sınıf": {
    "Matematik": ["Mantık", "Kümeler", "Denklemler ve Eşitsizlikler", "Üslü ve Köklü İfadeler", "Oran-Orantı", "Problemler", "Veri ve İstatistik", "Üçgenler", "Eşlik ve Benzerlik", "Dörtgenler"],
    "Fizik": ["Fizik Bilimine Giriş", "Madde ve Özellikleri", "Hareket ve Kuvvet", "Enerji", "Isı ve Sıcaklık", "Elektrostatik"],
    "Kimya": ["Kimya Bilimi", "Atom ve Periyodik Sistem", "Kimyasal Türler Arası Etkileşim", "Maddenin Halleri", "Doğa ve Kimya"],
    "Biyoloji": ["Yaşam Bilimi ve Biyoloji", "Hücre", "Canlılar Dünyası", "Hücre Bölünmeleri", "Kalıtım", "Ekosistem"],
    "Türk Dili ve Edebiyatı": ["Edebiyata Giriş", "Şiir", "Hikâye", "Roman", "Tiyatro", "Dil Bilgisi"],
    "Tarih": ["Tarih ve Zaman", "İnsanlığın İlk Dönemleri", "Orta Çağ'da Dünya", "İlk Türk Devletleri", "İslam Tarihi"],
    "Coğrafya": ["Doğa ve İnsan", "Dünya'nın Şekli ve Hareketleri", "Harita Bilgisi", "İklim Bilgisi", "Yer Şekilleri"]
  },
  "10. Sınıf": {
    "Matematik": ["Fonksiyonlar", "Polinomlar", "İkinci Dereceden Denklemler", "Dörtgenler ve Çokgenler", "Uzay Geometri", "Olasılık"],
    "Fizik": ["Elektrik ve Manyetizma", "Basınç ve Kaldırma Kuvveti", "Dalgalar", "Optik"],
    "Kimya": ["Kimyasal Tepkimeler", "Karışımlar", "Asitler-Bazlar-Tuzlar", "Kimya Her Yerde"],
    "Biyoloji": ["Kalıtım", "Ekosistem", "Güncel Çevre Sorunları", "Sistemler"],
    "Türk Dili ve Edebiyatı": ["Şiir", "Destan ve Efsane", "Hikâye", "Roman", "Tiyatro", "Anı", "Dil Bilgisi"],
    "Tarih": ["Türk-İslam Devletleri", "Osmanlı Kuruluş-Yükseliş", "Anadolu Beylikleri", "Dünya Gücü Osmanlı"],
    "Coğrafya": ["Nüfus", "Göç", "Ekonomik Faaliyetler", "Türkiye'de Nüfus ve Yerleşme"]
  },
  "11. Sınıf": {
    "Matematik": ["Trigonometri", "Analitik Geometri (Doğru Denklemi)", "Çember ve Daire", "Fonksiyonlarda Uygulamalar (Parabol)", "İkinci Dereceden Denklemler", "İkinci Dereceden Eşitsizlikler", "Uzay Geometri", "Olasılık", "İstatistik"],
    "Fizik": ["Vektörler", "Kuvvet ve Hareket", "Newton'un Hareket Yasaları", "Enerji", "İtme ve Momentum", "Tork ve Denge", "Basit Makineler", "Elektrik ve Manyetizma", "Dalgalar", "Basit Harmonik Hareket"],
    "Kimya": ["Modern Atom Teorisi", "Gazlar", "Sıvı Çözeltiler ve Çözünürlük", "Kimyasal Tepkimelerde Enerji", "Kimyasal Tepkimelerde Hız", "Kimyasal Denge", "Asit-Baz Dengesi", "Çözünürlük Dengesi"],
    "Biyoloji": ["Sinir Sistemi", "Endokrin Sistem", "Duyu Organları", "Destek ve Hareket Sistemi", "Sindirim Sistemi", "Dolaşım Sistemi", "Solunum Sistemi", "Boşaltım Sistemi", "Üreme Sistemi ve Gelişme", "Komünite ve Popülasyon Ekolojisi"],
    "Türk Dili ve Edebiyatı": ["Şiir", "Hikâye", "Roman", "Tiyatro", "Makale", "Dil Bilgisi"],
    "Tarih": ["Osmanlı Dağılma Dönemi", "Değişen Dünya Dengeleri", "I. Dünya Savaşı"],
    "Coğrafya": ["Küresel Ortam ve Bölgeler", "Ekonomik Faaliyetler", "Türkiye'nin Coğrafi Özellikleri"]
  },
  "12. Sınıf": {
    "Matematik": ["Fonksiyonlarda Uygulamalar", "Limit", "Türev", "İntegral", "Diziler", "Logaritma", "Katı Cisimler"],
    "Fizik": ["Çembersel Hareket", "Basit Harmonik Hareket", "Dalgalar", "Atom Fiziği", "Radyoaktivite", "Modern Fizik"],
    "Kimya": ["Kimyasal Tepkimelerde Enerji", "Kimyasal Tepkimelerde Hız", "Kimyasal Denge", "Organik Kimya", "Elektrokimya"],
    "Biyoloji": ["Genden Proteine", "Canlılarda Enerji Dönüşümleri", "Bitki Biyolojisi", "Komünite ve Popülasyon Ekolojisi"],
    "Türk Dili ve Edebiyatı": ["Şiir", "Roman", "Hikâye", "Tiyatro", "Deneme", "Dil Bilgisi"],
    "Tarih": ["Türk İnkılabı", "Atatürk İlkeleri"],
    "Coğrafya": ["Küresel Ortam", "Bölgeler ve Ülkeler", "Türkiye'nin Coğrafi Özellikleri"]
  },

  /* ---------------- Sınav Hazırlık ---------------- */
  "TYT": {
    "Matematik": ["Temel Kavramlar", "Sayı Basamakları", "Bölme ve Bölünebilme", "EBOB-EKOK", "Rasyonel Sayılar", "Ondalık Sayılar", "Basit Eşitsizlikler", "Mutlak Değer", "Üslü Sayılar", "Köklü Sayılar", "Çarpanlara Ayırma", "Oran-Orantı", "Problemler", "Kümeler", "Fonksiyonlar", "Polinomlar", "Permütasyon-Kombinasyon", "Olasılık", "İstatistik", "Üçgenler", "Dörtgenler", "Çember ve Daire", "Katı Cisimler", "Analitik Geometri"],
    "Fizik": ["Fizik Bilimine Giriş", "Madde ve Özellikleri", "Sıvıların Kaldırma Kuvveti", "Basınç", "Isı ve Sıcaklık", "Genleşme", "Hareket", "Kuvvet", "Enerji", "Elektrik", "Manyetizma", "Optik", "Dalgalar"],
    "Kimya": ["Kimya Bilimi", "Atom ve Periyodik Sistem", "Kimyasal Türler Arası Etkileşimler", "Maddenin Halleri", "Doğa ve Kimya", "Karışımlar", "Asitler-Bazlar-Tuzlar", "Kimya Her Yerde"],
    "Biyoloji": ["Canlıların Ortak Özellikleri", "Canlıların Temel Bileşenleri", "Hücre", "Hücre Bölünmeleri", "Kalıtım", "Canlıların Sınıflandırılması", "Ekosistem Ekolojisi", "Güncel Çevre Sorunları"],
    "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Ses Bilgisi", "Yazım Kuralları", "Noktalama İşaretleri", "Sözcük Türleri", "Cümle Bilgisi", "Anlatım Bozuklukları"],
    "Tarih": ["Tarih ve Zaman", "İlk ve Orta Çağ Uygarlıkları", "İslamiyet Öncesi Türk Tarihi", "İslam Tarihi", "Türk-İslam Devletleri", "Osmanlı Kuruluş-Yükseliş", "Osmanlı Dağılma Dönemi", "Kurtuluş Savaşı", "Atatürk Dönemi İç-Dış Politika", "Atatürk İlkeleri"],
    "Coğrafya": ["Doğa ve İnsan", "Harita Bilgisi", "Dünya'nın Şekli ve Hareketleri", "İklim Bilgisi", "Yer Şekilleri", "Nüfus", "Göç", "Ekonomik Faaliyetler", "Türkiye'nin Coğrafi Özellikleri"]
  },
  "AYT": {
    "Matematik": ["Fonksiyonlar", "Polinomlar", "İkinci Dereceden Denklemler", "Trigonometri", "Logaritma", "Diziler", "Limit", "Türev", "İntegral", "Analitik Geometri", "Çember ve Daire", "Katı Cisimler", "Olasılık"],
    "Fizik": ["Vektörler", "Kuvvet ve Hareket", "Newton'un Hareket Yasaları", "İş-Enerji", "İtme ve Momentum", "Tork", "Elektrik ve Manyetizma", "Dalgalar", "Optik", "Atom ve Modern Fizik"],
    "Kimya": ["Modern Atom Teorisi", "Gazlar", "Çözeltiler", "Kimyasal Tepkimelerde Enerji", "Hız", "Denge", "Asit-Baz", "Çözünürlük", "Organik Kimya", "Elektrokimya"],
    "Biyoloji": ["Sinir ve Endokrin Sistem", "Duyu Organları", "Destek ve Hareket", "Sindirim", "Dolaşım", "Solunum", "Boşaltım", "Üreme", "Genden Proteine", "Komünite ve Popülasyon"],
    "Edebiyat": ["Şiir", "Roman", "Hikâye", "Tiyatro", "Deneme", "Eleştiri", "Edebi Akımlar"],
    "Tarih": ["Osmanlı Tarihi", "Türk İnkılabı", "Çağdaş Türk ve Dünya Tarihi"],
    "Coğrafya": ["Doğal Sistemler", "Beşeri Sistemler", "Küresel Ortam"]
  },

  /* ---------------- Üniversite (başlangıç seti) ---------------- */
  "Üniversite 1": {
    "Matematik I": ["Fonksiyonlar", "Limit", "Süreklilik", "Türev", "Türev Uygulamaları", "İntegral", "İntegral Uygulamaları"],
    "Fizik I": ["Vektörler", "Kinematik", "Newton Yasaları", "İş ve Enerji", "Momentum", "Dönme Hareketi"],
    "Programlama I": ["Algoritma", "Değişkenler", "Koşul Yapıları", "Döngüler", "Fonksiyonlar", "Diziler"]
  },
  "Üniversite 2": {
    "Matematik II": ["Diziler ve Seriler", "Çok Değişkenli Fonksiyonlar", "Kısmi Türev", "Katlı İntegral", "Diferansiyel Denklemler"],
    "Fizik II": ["Elektrik Alan", "Gauss Yasası", "Sığa", "Akım", "Manyetizma", "Faraday Yasası", "Optik"],
    "Veri Yapıları": ["Listeler", "Yığın", "Kuyruk", "Ağaçlar", "Graflar", "Sıralama", "Arama"]
  },

  /* ---------------- Maarif Modeli ---------------- */
  "Maarif 1. Aşama": {
    "Matematik": ["Sayılar ve İşlemler", "Cebir", "Geometri ve Ölçme", "Veri ve İstatistik", "Olasılık", "Fonksiyonlar"],
    "Fizik": ["Fizik Bilimine Giriş", "Madde ve Doğa", "Hareket ve Kuvvet", "Enerji", "Elektrik", "Dalgalar"],
    "Kimya": ["Kimya Bilimi", "Atom", "Etkileşimler", "Maddenin Halleri", "Tepkimeler"],
    "Biyoloji": ["Canlılar ve Yaşam", "Hücre", "Kalıtım", "Ekosistem"],
    "Türk Dili ve Edebiyatı": ["Okuma Kültürü", "Yazma", "Sözlü İletişim", "Metin Türleri"],
    "Tarih": ["Zaman ve Tarih", "İlk Medeniyetler", "Türk Tarihi", "Osmanlı"],
    "Coğrafya": ["Doğal Sistemler", "Beşeri Sistemler", "Küresel Bağlantılar"]
  },
  "Maarif 2. Aşama": {
    "Matematik": ["Fonksiyonlar", "Trigonometri", "Geometri", "Türev", "İntegral", "Olasılık", "Veri Analizi"],
    "Fizik": ["Kuvvet ve Hareket", "Enerji ve Momentum", "Elektrik ve Manyetizma", "Dalgalar", "Modern Fizik"],
    "Kimya": ["Atom ve Periyodik Sistem", "Gazlar", "Çözeltiler", "Denge", "Organik Kimya"],
    "Biyoloji": ["İnsan Fizyolojisi", "Genden Proteine", "Ekosistem ve Sürdürülebilirlik"],
    "Türk Dili ve Edebiyatı": ["Şiir", "Anlatı", "Tiyatro", "Deneme", "Edebi Akımlar"],
    "Tarih": ["Türk-İslam Tarihi", "Osmanlı", "Yakın Çağ", "İnkılap Tarihi"],
    "Coğrafya": ["Doğal ve Beşeri Sistemler", "Türkiye Coğrafyası"]
  }
};