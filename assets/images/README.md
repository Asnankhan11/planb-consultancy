# Plan B Careers — Image Asset System

## How It Works

Every image on the website uses a **fixed filename**. When you replace a placeholder file with a real image using the **exact same filename**, the website automatically shows the new image — no code changes needed.

---

## Folder Structure

```
assets/images/
├── hero/
│   └── hero-banner.svg          → Replace with hero-banner.jpg (1200×630 px)
│
├── reviews/
│   ├── review-placeholder.svg        → Default avatar for unknown candidates
│   ├── review-priya-sharma.svg       → Replace with real photo (200×200 px, square)
│   ├── review-rahul-deshmukh.svg
│   ├── review-anjali-patil.svg
│   ├── review-sanjay-kulkarni.svg
│   ├── review-meena-wankhede.svg
│   └── review-vikram-jadhav.svg
│
├── payment-proofs/
│   ├── payment-proof-01.svg          → Replace with screenshot (JPG/PNG, 9:16 ratio)
│   ├── receipt-01.svg
│   ├── invoice-gst-01.svg
│   ├── confirmation-message-01.svg
│   ├── salary-credit-01.svg
│   └── upi-payment-01.svg
│
├── offer-letters/
│   ├── offer-letter-01.svg           → Replace with scan/photo (JPG/PNG/PDF, A4)
│   ├── letter-of-intent-01.svg
│   ├── agreement-01.svg
│   ├── joining-letter-01.svg
│   ├── training-mail-01.svg
│   ├── registration-certificate.svg
│   ├── gst-certificate.svg
│   └── business-documents.svg
│
├── qr-codes/
│   ├── qr-website.svg               → Replace with real QR (PNG/SVG, 400×400 px)
│   ├── qr-registration-form.svg
│   ├── qr-whatsapp.svg
│   ├── qr-instagram.svg
│   └── qr-linkedin.svg
│
└── team/
    ├── team-founder-asnan.svg        → Replace with real photo (JPG/PNG, 600×700 px)
    ├── team-consultant-01.svg
    └── team-consultant-02.svg
```

---

## How to Replace a Placeholder

1. Take or export your image
2. Rename it to **exactly** match the placeholder filename (e.g. `payment-proof-01.jpg`)
3. Place it in the correct subfolder
4. **Delete or keep the old `.svg`** — the HTML references the new file directly
5. Open the relevant `.html` file and update the `src` extension if changing format

> **Tip:** Use `.jpg` for photos, `.png` for documents/screenshots, `.svg` or `.png` for QR codes.

---

## Recommended Sizes

| Category         | Recommended Size | Format         |
|------------------|-----------------|----------------|
| Hero Banner      | 1200 × 630 px   | JPG / WEBP     |
| Review Avatars   | 200 × 200 px    | JPG / PNG      |
| Payment Proofs   | 400 × 700 px    | JPG / PNG      |
| Offer Letters    | 794 × 1123 px   | PNG / PDF      |
| QR Codes         | 400 × 400 px    | PNG / SVG      |
| Team Photos      | 600 × 700 px    | JPG / WEBP     |

---

## Performance Notes

- All images in `trust.html` use `loading="lazy"` for lazy loading
- Images use `width` and `height` attributes to prevent layout shift (Core Web Vitals)
- Use WEBP format for 30–50% smaller file sizes vs JPG
- Max recommended file sizes: Hero ≤ 200 KB, Others ≤ 100 KB each

---

## Naming Convention

| Type        | Pattern                            | Example                       |
|-------------|------------------------------------|-------------------------------|
| Hero        | `hero-[purpose].[ext]`             | `hero-banner.jpg`             |
| Reviews     | `review-[firstname-lastname].[ext]`| `review-priya-sharma.jpg`     |
| Payments    | `[type]-[sequence].[ext]`          | `payment-proof-01.png`        |
| Documents   | `[document-type]-[sequence].[ext]` | `offer-letter-01.png`         |
| QR Codes    | `qr-[platform].[ext]`              | `qr-whatsapp.png`             |
| Team        | `team-[role-name].[ext]`           | `team-founder-asnan.jpg`      |

---

*Plan B Careers — Akola, Maharashtra*
