"use client"

import { useState, useMemo } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, setDoc, query, orderBy, where, deleteDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  UserPlus, 
  Loader2, 
  Save, 
  AlertCircle, 
  Info, 
  ShieldCheck, 
  Trash2, 
  Edit2, 
  History,
  CalendarDays,
  UserCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function InputAbsensiManual() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Guard: Admin resmi saja
  const isAuthorized = user?.email === "admin@wringinharjo.id" || 
                       user?.email === "wringinharjo@gmail.id" || 
                       user?.email?.toLowerCase() === "wringinharjo00@gmail.com";

  // Ambil daftar dari 'personel' (Database Akun)
  const accountsRef = useMemoFirebase(() => 
    (db && user && isAuthorized) ? query(collection(db, "personel"), orderBy("nama", "asc")) : null, 
  [db, user, isAuthorized])
  const { data: accountList, isLoading: isAccountsLoading } = useCollection(accountsRef)

  const [formData, setFormData] = useState({
    accountId: "",
    tanggal: format(new Date(), "yyyy-MM-dd"),
    jam_masuk: "08:00",
    jam_pulang: "15:30",
    status: "hadir"
  })

  // LOGIKA FETCH HISTORY: Berdasarkan Filter di Form
  const historyRef = useMemoFirebase(() => {
    if (!db || !user || !isAuthorized) return null;
    
    let q = query(
        collection(db, "absensi"), 
        where("tanggal", "==", formData.tanggal)
    );

    // Jika pilih akun spesifik, filter lebih dalam
    if (formData.accountId && formData.accountId !== "all") {
        const selectedAcc = accountList?.find(a => a.id === formData.accountId);
        if (selectedAcc?.uid) {
            q = query(q, where("personel_id", "==", selectedAcc.uid));
        }
    }

    return q;
  }, [db, user, isAuthorized, formData.tanggal, formData.accountId, accountList])

  const { data: historyList, isLoading: isHistoryLoading } = useCollection(historyRef)

  const handleSubmit = async () => {
    if (!db || !formData.accountId) {
        toast({ variant: "destructive", title: "Pilih Personel", description: "Silakan pilih akun perangkat terlebih dahulu." })
        return
    }

    setIsSaving(true)
    try {
      const accounts = accountList || [];
      const targets = formData.accountId === "all" 
        ? accounts.filter(a => a.role !== "admin")
        : accounts.filter(a => a.id === formData.accountId);

      if (targets.length === 0) throw new Error("Tidak ada data personel.");

      let successCount = 0;
      let unsyncedNames: string[] = [];

      for (const acc of targets) {
        const targetUid = acc.uid; 

        if (!targetUid) {
          unsyncedNames.push(acc.nama);
          continue;
        }

        const absenId = `${targetUid}_${formData.tanggal}`;
        await setDoc(doc(db, "absensi", absenId), {
          id: absenId,
          personel_id: targetUid, 
          nama: acc.nama,
          tanggal: formData.tanggal,
          jam_masuk: formData.jam_masuk,
          jam_pulang: formData.jam_pulang,
          status: formData.status,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(), // Akan dimerge jika sudah ada
          input_by: "admin"
        }, { merge: true });
        
        successCount++;
      }

      if (unsyncedNames.length > 0) {
        toast({ 
          variant: "destructive",
          title: "Perhatian", 
          description: `${unsyncedNames.length} Personel (termasuk ${unsyncedNames[0]}) belum sinkron UID. Minta mereka login di HP agar data muncul.` 
        });
      }

      if (successCount > 0) {
        toast({ title: "Data Berhasil Disimpan", description: `${successCount} data absensi telah dicatat.` });
      }

    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: e.message });
    } finally {
      setIsSaving(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus rekaman absensi ini?")) return
    setIsDeletingId(id)
    try {
        await deleteDoc(doc(db, "absensi", id))
        toast({ title: "Dihapus", description: "Data absensi telah dihapus dari database." })
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal Menghapus" })
    } finally {
        setIsDeletingId(null)
    }
  }

  const handleEdit = (absen: any) => {
    // Cari accountId berdasarkan personel_id (uid)
    const acc = accountList?.find(a => a.uid === absen.personel_id);
    if (acc) {
        setFormData({
            accountId: acc.id,
            tanggal: absen.tanggal,
            jam_masuk: absen.jam_masuk || "08:00",
            jam_pulang: absen.jam_pulang || "15:30",
            status: absen.status || "hadir"
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast({ title: "Data Dimuat", description: "Silakan ubah isian dan klik Simpan kembali." });
    }
  }

  if (!isAuthorized) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
       <header>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Input Absensi Manual</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase">Database: Manajemen Akun Perangkat (Real-time)</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* FORM INPUT */}
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-3xl overflow-hidden bg-white sticky top-6">
            <CardHeader className="bg-slate-900 p-6 text-white">
                <CardTitle className="text-base flex items-center gap-3 uppercase font-black">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Formulir Admin
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Pilih Personel</Label>
                    <Select value={formData.accountId} onValueChange={v => setFormData(p => ({ ...p, accountId: v }))}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30 font-bold text-xs">
                            <SelectValue placeholder={isAccountsLoading ? "Memuat Akun..." : "Pilih Nama Personel..."} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-black text-primary uppercase text-[10px] bg-primary/5">
                            --- SELURUH PERANGKAT ---
                            </SelectItem>
                            {accountList?.filter(a => a.role !== 'admin').map(a => (
                                <SelectItem key={a.id} value={a.id} className="font-bold uppercase text-[10px]">
                                    {a.nama} {!a.uid && " (⚠️)"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Tanggal</Label>
                    <Input type="date" value={formData.tanggal} onChange={e => setFormData(p => ({ ...p, tanggal: e.target.value }))} className="h-11 rounded-xl font-bold text-xs" />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Status Kehadiran</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 font-bold text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hadir" className="text-green-600 font-bold text-[10px] uppercase">HADIR</SelectItem>
                            <SelectItem value="telat" className="text-orange-600 font-bold text-[10px] uppercase">TELAT</SelectItem>
                            <SelectItem value="izin" className="text-blue-600 font-bold text-[10px] uppercase">IZIN / SAKIT</SelectItem>
                            <SelectItem value="dinas_luar" className="text-indigo-600 font-bold text-[10px] uppercase">DINAS LUAR</SelectItem>
                            <SelectItem value="alpha" className="text-red-600 font-bold text-[10px] uppercase">ALPHA / TK</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Jam Masuk</Label>
                        <Input type="time" value={formData.jam_masuk} onChange={e => setFormData(p => ({ ...p, jam_masuk: e.target.value }))} className="h-11 rounded-xl font-bold text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Jam Pulang</Label>
                        <Input type="time" value={formData.jam_pulang} onChange={e => setFormData(p => ({ ...p, jam_pulang: e.target.value }))} className="h-11 rounded-xl font-bold text-xs" />
                    </div>
                </div>

                <Button 
                    onClick={handleSubmit} 
                    disabled={isSaving} 
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase shadow-lg gap-3 transition-all active:scale-[0.98] text-xs"
                >
                    {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                    Simpan Ke Database
                </Button>
            </CardContent>
        </Card>

        {/* LIST HISTORY */}
        <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-black uppercase text-slate-800">Riwayat Terpilih</h3>
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">
                    {formData.tanggal}
                </Badge>
            </div>

            <div className="grid gap-3">
                {isHistoryLoading ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                        <p className="text-[10px] font-black uppercase text-slate-400">Memuat Riwayat...</p>
                    </div>
                ) : historyList && historyList.length > 0 ? (
                    historyList.map((absen) => (
                        <div key={absen.id} className="p-4 bg-white border rounded-2xl shadow-sm flex items-center justify-between gap-4 group hover:border-primary/40 transition-all animate-in fade-in slide-in-from-right-2">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                                    absen.status === 'hadir' ? 'bg-green-50 border-green-100 text-green-600' :
                                    absen.status === 'telat' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                                    absen.status === 'alpha' ? 'bg-red-50 border-red-100 text-red-600' :
                                    'bg-blue-50 border-blue-100 text-blue-600'
                                )}>
                                    <UserCheck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-xs text-slate-900 uppercase truncate leading-none mb-1">{absen.nama}</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                        {absen.jam_masuk || '--'} - {absen.jam_pulang || '--'} • <span className="text-primary">{absen.status}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(absen)}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-red-50" onClick={() => handleDelete(absen.id)} disabled={isDeletingId === absen.id}>
                                    {isDeletingId === absen.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center border-2 border-dashed rounded-[2rem] bg-slate-50/50 flex flex-col items-center gap-3">
                        <CalendarDays className="h-10 w-10 text-slate-200" />
                        <p className="text-[10px] font-black uppercase text-slate-400">Belum ada data absensi di tanggal ini</p>
                    </div>
                )}
            </div>

            <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-blue-800 uppercase">Informasi:</p>
                    <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
                        Gunakan tombol pensil untuk memuat data kembali ke formulir jika ingin melakukan koreksi waktu atau status.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
