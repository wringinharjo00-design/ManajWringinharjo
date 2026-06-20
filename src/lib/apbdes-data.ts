/**
 * @fileOverview Definisi tipe dan struktur data APBDes.
 * Data utama kini dikelola melalui Firestore (koleksi: apbdes_records).
 */

export interface ApbItem {
  id?: string;
  bidang: number;
  kode: string;
  uraian: string;
  volume: string;
  satuan: string;
  nominal: number;
  sumber: string;
  tahun: string; // Tambahan field tahun untuk dukungan multi-tahun
}

export const BIDANG_NAMES: Record<number, string> = {
  1: "Penyelenggaraan Pemerintahan",
  2: "Pelaksanaan Pembangunan",
  3: "Pembinaan Kemasyarakatan",
  4: "Pemberdayaan Masyarakat",
  5: "Penanggulangan Bencana",
};

/**
 * APB_DATA dikosongkan agar sistem memulai dari database bersih (Firestore).
 */
export const APB_DATA: ApbItem[] = [];
