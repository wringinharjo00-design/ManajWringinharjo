/**
 * @fileOverview Konfigurasi terpusat untuk integrasi layanan Google.
 */

interface GoogleConfig {
  /**
   * URL hasil deploy Google Apps Script yang berfungsi sebagai backend.
   */
  appsScriptUrl: string;

  /**
   * ID Kalender Google yang akan digunakan untuk manajemen agenda.
   * Menggunakan 'primary' adalah opsi paling aman untuk merujuk ke kalender utama.
   */
  calendarId: string;

  /**
   * ID folder "parent" di Google Drive tempat laporan-laporan baru akan disimpan.
   */
  parentFolderId: string;
}

export const GOOGLE_CONFIG: GoogleConfig = {
  // URL Deployment sesuai parameter backend user
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbwerUYtqq2OMXxQuDvGe9qzZOamaVg4Sh52CoXYIh-JRkn3os09PvjVkIPEDXbPqJtZbA/exec",
  calendarId: "primary", // Diubah ke 'primary' untuk mencegah error 'Not Found'
  parentFolderId: "1-yZW2Z7V5J2j2aVp9p4aJ3R8Q9J4v8tU",
};
