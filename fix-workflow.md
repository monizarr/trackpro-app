## 1. Memulai produksi produk dengan varian tertentu
    _Persiapan produksi_

    a) Owner / Ka. Prod / ?Ka. Gudang **request / membuat produksi**
    b) Owner / Ka. Prod **verifikasi produksi**



## 2. Persiapan bahan baku

_Bahan dibawa ke tempat kepala pemotong dan pemotong __**memulai pemotongan**__ bahan baku_

    a) Ka. Pemotong / Ka. Prod **mengisi hasil pemotongan** bahan baku
    b) Owner / Ka. Prod **verifikasi hasil pemotongan **bahan baku
    c) Owner / Ka. Prod **menugaskan bahan ke kepala penjahit**

__di tahap pemotongan tidak ada barang reject__ 



## 3. Penjahitan
_Bahan hasil potong dibawa ke tempat jahit dan kepala penjahit __**memulai penjahitan**__ bahan baku menjadi sub batch. Karena berapapun jumlahnya barang yang sudah dijahit akan langsung dikirim ke finishing_

    a) Ka. Penjahit / Ka. Prod **mengisi hasil jahitan**
    b) Owner / Ka. Prod **verifikasi hasil jahitan**
    c) Owner / Ka. Prod **menugaskan bahan ke kepala finishing**
    d) **Jika masih ada pcs dari pemotongan yang belum dijahit maka masih bisa menginputkan hasil jahit dan verifikasi hasil jahitan, sampai bahan hasil potong habis**

__di tahap penjahitan tidak ada barang reject__ 



## 4. Finishing
_Hasil jahit dibawa ke tempat finishing dan kepala penjahit __**memulai finishing (kancing, rimbas, setrika, dll). Sub Batch finishing sudah berbeda dengan sub batch yang dikirim dari penjahitan**_

    a) Ka. Finishing **mengisi hasil finishing dalam jumlah tertentu (menyesuaikan barang yang diterima dari penjahitan dan yang sudah selesai finishing)**
    b) Ka. Prod **verifikasi hasil finishing **yang sudah selesai diproses di finishing  
    c) Ka. Prod **menyerahkan ke Ka. Gudang** (membawa sebagian hasil finishing yang sudah selesai ke gudang ) 

__di tahap finishing data output barang produksi akan tersortir menjadi barang jadi dan barang cacat produksi, barang cacat produksi seperti : kotor, sobek, rusak jahit__


## 5. Gudang
    _Sebagian hasil finishing yang sudah jadi, dibawa Ka. produksi untuk diserahkan ke Ka. gudang_

    a) Owner / Ka. gudang **verifikasi hasil finishing **untuk** **masuk gudang (baik yang good / cacat (kotor, sobek, rusak jahit))
    b) Ka. gudang akan **melakukan re produksi** jika ada barang yang cacat kotor dengan mencucinya 
    c) Ka. gudang **menyimpan produk** jadi di tempat barang jadi, dan barang cacat (sobek atau rusak jahit) di tempat barang BS (Bad Stock)

__di tahap penyimpanan di gudang barang jadi akan disimpan oleh kepala gudang di tempat rak barang jadi, dan barang yang cacat (kotor) produksi akan dilakukan re produksi dengan di cuci, jika barang cacat (sobek atau rusak jahit) akan disimpan di tempat barang gagal produksi atau biasa disebut barang BS (Bad Stock)__



### _**Tahap "4.a" sampai "5.c" berulang, sampai hasil jahit yang masuk ke finishing selesai diproses dan sampai disimpan di gudang. Jika barang yang masuk ke finishing sudah sama dengan output barang yang masuk gudang maka proses produksi bisa diubah statusnya menjadi "Selesai Produksi"**_


### _**Untuk sub batch berada di Finishing (tidak di Penjahitan), yaitu untuk menyimpan data hasil finishing yang siap diteruskan ke gudang. Dan cukup inputkan hasilnya saja tidak perlu assign ke finisher. Karena aplikasi ini fokus untuk koordinasi antar kepala, (kepala produksi, kepala pemotong, kepala penjahit, kepala finishing, kepala gudang) tidak sampai ke penugasan dari kepala ke karyawan**_
