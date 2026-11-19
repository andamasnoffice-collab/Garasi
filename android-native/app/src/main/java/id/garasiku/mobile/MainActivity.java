package id.garasiku.mobile;

import android.os.Bundle;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.FirebaseFirestore;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showStatus("GarasiKu Android\nMenyiapkan koneksi Firebase…");
        try {
            FirebaseApp.initializeApp(this);
            FirebaseAuth auth = FirebaseAuth.getInstance();
            Runnable readSharedState = () -> FirebaseFirestore.getInstance()
                .collection("garasiku_fleet")
                .document("shared_state")
                .get(com.google.firebase.firestore.Source.SERVER)
                .addOnSuccessListener(snapshot -> showStatus(snapshot.exists()
                    ? "GarasiKu Android\nTerhubung • shared_state terbaca"
                    : "GarasiKu Android\nTerhubung • shared_state belum dibuat"))
                .addOnFailureListener(error -> showStatus("Gagal membaca server: " + error.getMessage()));

            if (auth.getCurrentUser() != null) {
                readSharedState.run();
            } else {
                auth.signInAnonymously()
                    .addOnSuccessListener(result -> readSharedState.run())
                    .addOnFailureListener(error -> showStatus("Autentikasi gagal: " + error.getMessage()));
            }
        } catch (Exception error) {
            showStatus("Firebase belum dikonfigurasi. Tambahkan google-services.json.\n" + error.getMessage());
        }
    }

    private void showStatus(String message) {
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextColor(0xFFE2E8F0);
        text.setTextSize(18);
        text.setGravity(Gravity.CENTER);
        text.setPadding(32, 32, 32, 32);
        LinearLayout layout = new LinearLayout(this);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xFF090D16);
        layout.addView(text, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));
        setContentView(layout);
    }
}
