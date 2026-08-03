"""Set uji adversarial: URL phishing yang sengaja disamarkan, dikelompokkan per teknik.

SEMUA URL DI SINI BUATAN dan tidak menunjuk ke situs sungguhan. Isinya meniru
pola penyamaran yang lazim dipakai kampanye phishing, bukan salinan URL hidup.
Tujuannya satu: tahu teknik mana yang bikin detektor ini buta, bukan bikin angka
bagus. Kategori diukur SENDIRI-SENDIRI, karena rata-rata gabungan akan menutupi
kategori yang jebol total.

Kelompok `control_benign` bukan phishing. Tanpa itu, "recall 100% di adversarial"
tidak berarti apa-apa: model yang menjawab PHISHING untuk semua URL juga dapat
100%. Kelompok ini mengukur harga yang dibayar di sisi false positive.

Label mengikuti konvensi dataset: 1 = legitimate, 0 = phishing.
"""
from __future__ import annotations

CATEGORIES: dict[str, str] = {
    "typosquatting": "Nama brand salah eja di domain terdaftar (huruf ditukar, angka jadi huruf).",
    "homograph": "Huruf Kiril yang bentuknya sama dengan Latin (а, е, о, р, с) di nama brand.",
    "punycode": "Domain homograph yang sama, tapi dalam bentuk ASCII xn-- seperti yang dilihat resolver.",
    "shortener": "URL diperpendek, sehingga host aslinya tidak kelihatan sama sekali.",
    "subdomain_spoof": "Nama domain asli ditaruh sebagai subdomain milik penyerang.",
    "userinfo_obfuscation": "Bagian userinfo (@) dan IP non-desimal dipakai menyamarkan host sebenarnya.",
    "control_benign": "URL sah yang penampakannya mencurigakan. Dipakai mengukur false positive.",
}

# Host homograph memakai huruf Kiril. Kategori punycode diturunkan otomatis dari
# daftar ini (lihat build_punycode()), supaya dua kategori itu benar-benar
# merepresentasikan serangan yang sama dalam dua bentuk penulisan.
_HOMOGRAPH_HOSTS = [
    ("раypal.com", "/signin"),        # р, а Kiril -> paypal
    ("gооgle.com", "/accounts/login"),  # о Kiril -> google
    ("аpple.com", "/id/verify"),            # а Kiril -> apple
    ("micrоsoft.com", "/office/login"),     # о Kiril -> microsoft
    ("аmazon.com", "/ap/signin"),           # а Kiril -> amazon
    ("fаcebook.com", "/login.php"),         # а Kiril -> facebook
    ("netflіx.com", "/billing"),            # і Kiril -> netflix
    ("bсa.co.id", "/klikbca"),              # с Kiril -> bca
]


def build_punycode() -> list[str]:
    """Ubah host homograph jadi bentuk xn-- (persis yang dikirim ke DNS)."""
    import idna

    out = []
    for host, path in _HOMOGRAPH_HOSTS:
        try:
            ascii_host = idna.encode(host, uts46=True).decode("ascii")
        except Exception:
            ascii_host = host.encode("idna").decode("ascii")
        out.append(f"https://{ascii_host}{path}")
    return out


def _homograph_urls() -> list[str]:
    return [f"https://{h}{p}" for h, p in _HOMOGRAPH_HOSTS]


TYPOSQUATTING = [
    "http://goggle.com/accounts/signin",
    "http://paypa1.com/login",
    "https://faceb00k.com/login.php",
    "http://arnazon-security.com/verify",
    "https://micros0ft-update.com/office365",
    "http://netfl1x-billing.com/account",
    "https://whatsapp-web.co/login",
    "http://1inkedin.com/uas/login",
    "https://tokopedla.com/masuk",
    "http://klikbca-co.id/login",
    "https://instagrarn.com/accounts/login",
    "http://binancce.com/en/my/settings",
]

SHORTENER = [
    "https://bit.ly/3xK9pQrZ",
    "http://tinyurl.com/y7mn2ksd",
    "https://t.co/aB9cD1e2Fg",
    "https://cutt.ly/verify-account",
    "https://is.gd/9kLm2p",
    "https://rb.gy/x8q2vt",
    "http://ow.ly/Jk4p30sPq1",
    "https://shorturl.at/aBmZ7",
]

SUBDOMAIN_SPOOF = [
    "http://paypal.com.attacker.net/login",
    "https://accounts.google.com.secure-verify.ru/signin",
    "http://login.microsoftonline.com.session-check.top/",
    "https://www.bca.co.id.verifikasi-akun.xyz/login",
    "http://appleid.apple.com.icloud-find.info/locate",
    "https://binus.ac.id.student-portal.online/login",
    "http://www.netflix.com.billing-update.cf/account",
    "https://secure.tokopedia.com.promo-hadiah.click/klaim",
]

USERINFO_OBFUSCATION = [
    "http://www.google.com@193.169.255.12/login",
    "https://accounts.google.com@evil-host.tk/signin",
    "http://paypal.com:secure@45.147.230.9/webscr",
    "https://www.bca.co.id@0x2e:8080/klikbca",
    "http://microsoft.com@login-verify.gq/office",
    "https://apple.com%2Fverify@icloud-lock.icu/find",
]

# Bukan phishing. Sengaja dipilih yang "kelihatan mencurigakan": banyak subdomain,
# kata login/verify/billing, query panjang, atau nama brand di path.
CONTROL_BENIGN = [
    "https://accounts.google.com/signin/v2/identifier",
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "https://www.paypal.com/signin",
    "https://appleid.apple.com/sign-in",
    "https://www.netflix.com/login",
    "https://myaccount.google.com/security-checkup",
    "https://support.microsoft.com/en-us/account-billing",
    "https://klikbca.com/",
    "https://ibank.klikbca.com/authentication.do",
    "https://www.google.com/search?q=paypal+login+verify+account",
    "https://binus.ac.id/",
    "https://student.binus.ac.id/login",
    "https://www.kemenkeu.go.id/informasi-publik",
    "https://github.com/login?return_to=%2Fsettings%2Fbilling",
    "https://id.shopee.co.id/buyer/login",
]


def build() -> list[tuple[str, str, int]]:
    """Return list of (kategori, url, label). Label 0 = phishing, 1 = legitimate."""
    groups: list[tuple[str, list[str], int]] = [
        ("typosquatting", TYPOSQUATTING, 0),
        ("homograph", _homograph_urls(), 0),
        ("punycode", build_punycode(), 0),
        ("shortener", SHORTENER, 0),
        ("subdomain_spoof", SUBDOMAIN_SPOOF, 0),
        ("userinfo_obfuscation", USERINFO_OBFUSCATION, 0),
        ("control_benign", CONTROL_BENIGN, 1),
    ]
    return [(cat, u, lbl) for cat, urls, lbl in groups for u in urls]


if __name__ == "__main__":
    for cat, url, lbl in build():
        print(f"{cat:22} {lbl} {url}")
