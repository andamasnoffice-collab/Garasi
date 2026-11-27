package id.uns.garasiku;
import android.app.PendingIntent;
import android.content.Intent;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
public class GarasiKuMessagingService extends FirebaseMessagingService {
 private static final AtomicInteger IDS = new AtomicInteger(1000);
 @Override public void onNewToken(String token) {
  super.onNewToken(token);
  getSharedPreferences("garasiku_fcm", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
  Log.i("GarasiKuFCM", "FCM token refreshed: " + token);
 }
 @Override public void onMessageReceived(RemoteMessage message) {
  super.onMessageReceived(message);
  String title="Garasi UNS", body="Ada informasi baru dari Garasi UNS.";
  if(message.getNotification()!=null) {
   if(message.getNotification().getTitle()!=null) title=message.getNotification().getTitle();
   if(message.getNotification().getBody()!=null) body=message.getNotification().getBody();
  }
  Map<String,String> data=message.getData();
  if(data.containsKey("title")) title=data.get("title");
  if(data.containsKey("body")) body=data.get("body");
  Intent launch=new Intent(this,MainActivity.class);
  launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  if(data.containsKey("url")) launch.putExtra("notification_url",data.get("url"));
  PendingIntent pending=PendingIntent.getActivity(this,IDS.incrementAndGet(),launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  NotificationCompat.Builder b=new NotificationCompat.Builder(this,"garasiku_updates")
   .setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body)
   .setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setPriority(NotificationCompat.PRIORITY_HIGH)
   .setAutoCancel(true).setContentIntent(pending);
  try { NotificationManagerCompat.from(this).notify(IDS.incrementAndGet(),b.build()); }
  catch(SecurityException e) { Log.w("GarasiKuFCM","Notification permission denied",e); }
 }
}
