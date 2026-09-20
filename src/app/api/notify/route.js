import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND = "Theralivo";

// Ίδια μεταβλητή με τα routes του site. Όταν μπει το domain, αλλάζει
// σε ΕΝΑ σημείο στο Vercel και ισχύει και εδώ.
const FROM = process.env.RESEND_FROM || `${BRAND} <onboarding@resend.dev>`;

export async function POST(request) {
  try {
    const { patient, therapist, request: req } = await request.json();

    const fullAddress = [req.street, req.city, req.zip, req.country].filter(Boolean).join(", ");

    // ── EMAIL ΠΡΟΣ ΑΣΘΕΝΗ ─────────────────────────────────────────────────────
    const patientEmail = await resend.emails.send({
      from: FROM,
      to: patient.email,
      subject: `Το αίτημά σας επιβεβαιώθηκε — ${BRAND}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
          <div style="background: #fff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
            
            <div style="text-align: center; margin-bottom: 28px;">
                            <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0;">Το αίτημά σας επιβεβαιώθηκε!</h1>
            </div>

            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
              Αγαπητέ/η <strong>${patient.name}</strong>,<br/>
              Χαρούμαστε να σας ενημερώσουμε ότι το αίτημά σας έχει ανατεθεί σε έναν από τους φυσιοθεραπευτές μας.
            </p>

            <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #2563eb;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Ο Θεραπευτής Σας</div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${therapist.name}</div>
              ${therapist.specialty ? `<div style="font-size: 14px; color: #2563eb; margin-bottom: 8px;">${therapist.specialty}</div>` : ""}
              <!-- Τηλέφωνο και email του θεραπευτή ΔΕΝ αποστέλλονται.
                   Η επικοινωνία γίνεται μέσα από την πλατφόρμα. -->
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Στοιχεία Αιτήματος</div>
              <div style="font-size: 14px; color: #475569; line-height: 1.8;">
                <div><strong>Υπηρεσία:</strong> ${req.service || "—"}</div>
                ${req.description ? `<div><strong>Περιγραφή:</strong> ${req.description}</div>` : ""}
                ${fullAddress ? `<div><strong>Διεύθυνση:</strong> ${fullAddress}</div>` : ""}
              </div>
            </div>

            <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 0;">
              Ο θεραπευτής σας θα επικοινωνήσει μαζί σας σύντομα για να επιβεβαιώσει την ημερομηνία και ώρα της επίσκεψης.<br/><br/>
              Αν έχετε οποιαδήποτε απορία, μη διστάσετε να επικοινωνήσετε μαζί μας.<br/><br/>
              <strong>Η ομάδα ${BRAND}</strong>
            </p>
          </div>
        </div>
      `,
    });

    // ── EMAIL ΠΡΟΣ ΘΕΡΑΠΕΥΤΗ ──────────────────────────────────────────────────
    const therapistEmail = await resend.emails.send({
      from: FROM,
      to: therapist.email,
      subject: `Νέα ανάθεση ασθενή — ${BRAND}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
          <div style="background: #fff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
            
            <div style="text-align: center; margin-bottom: 28px;">
                            <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0;">Νέος Ασθενής Ανατέθηκε</h1>
            </div>

            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
              Αγαπητέ/η <strong>${therapist.name}</strong>,<br/>
              Σας έχει ανατεθεί ένας νέος ασθενής. Παρακαλούμε επικοινωνήστε μαζί του το συντομότερο δυνατό.
            </p>

            <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #16a34a;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Στοιχεία Ασθενή</div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${patient.name}</div>
              <div style="font-size: 14px; color: #475569; line-height: 1.8;">
                <!-- Τηλέφωνο και email του ασθενή ΔΕΝ αποστέλλονται.
                     Ο θεραπευτής τα βλέπει στον πίνακά του, όπου η RLS
                     ελέγχει τι επιτρέπεται. -->
                ${fullAddress ? `<div><strong>Διεύθυνση:</strong> ${fullAddress}</div>` : ""}
              </div>
            </div>

            <div style="background: #fff7ed; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Πρόβλημα / Αίτημα</div>
              <div style="font-size: 14px; color: #475569; line-height: 1.8;">
                <div><strong>Υπηρεσία:</strong> ${req.service || "—"}</div>
                ${req.description ? `<div><strong>Περιγραφή:</strong> ${req.description}</div>` : ""}
              </div>
            </div>

            <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 0;">
              Παρακαλούμε επικοινωνήστε με τον ασθενή το συντομότερο για να κανονίσετε την επίσκεψη.<br/><br/>
              <strong>Η ομάδα ${BRAND}</strong>
            </p>
          </div>
        </div>
      `,
    });

    return Response.json({ success: true, patientEmail, therapistEmail });

  } catch (error) {
    console.error("Notify error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}