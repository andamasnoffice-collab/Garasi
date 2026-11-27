package id.uns.garasiku;
import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends Activity {
 private static final String APP_URL="https://andamasnoffice-collab.github.io/Garasi/";
 private static final int FILE_CHOOSER_REQUEST=4102;
 private WebView webView; private ProgressBar progress; private TextView errorView; private ValueCallback<Uri[]> fileCallback;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
  getWindow().setStatusBarColor(Color.rgb(9,13,22)); getWindow().setNavigationBarColor(Color.rgb(9,13,22));
  getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
  createNotificationChannel();
  if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
   requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},5201);
  FirebaseMessaging.getInstance().getToken().addOnCompleteListener(t->{if(t.isSuccessful()){String token=t.getResult();getSharedPreferences("garasiku_fcm",MODE_PRIVATE).edit().putString("fcm_token",token).apply();Log.i("GarasiKuFCM","FCM token ready: "+token);}else Log.w("GarasiKuFCM","Token error",t.getException());});
  buildLayout(); configureWebView(); if(state==null) openNotificationOrHome(getIntent()); else webView.restoreState(state);
 }
 private void createNotificationChannel(){if(Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel("garasiku_updates","Notifikasi Garasi UNS",NotificationManager.IMPORTANCE_HIGH);c.setDescription("Informasi aktivitas kendaraan dan E-Toll");getSystemService(NotificationManager.class).createNotificationChannel(c);}}
 private void openNotificationOrHome(Intent i){String u=i==null?null:i.getStringExtra("notification_url"); if(u!=null && u.startsWith("https://andamasnoffice-collab.github.io/Garasi/")) webView.loadUrl(u); else webView.loadUrl(APP_URL);}
 @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);String u=i.getStringExtra("notification_url");if(u!=null && u.startsWith("https://andamasnoffice-collab.github.io/Garasi/"))webView.loadUrl(u);}
 private void buildLayout(){FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(9,13,22));ViewCompat.setOnApplyWindowInsetsListener(root,(v,insets)->{Insets bars=insets.getInsets(WindowInsetsCompat.Type.systemBars());v.setPadding(0,bars.top,0,bars.bottom);return insets;});ViewCompat.requestApplyInsets(root);webView=new WebView(this);progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);progress.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(56,189,248)));errorView=new TextView(this);errorView.setTextColor(Color.WHITE);errorView.setTextSize(16);errorView.setGravity(17);errorView.setPadding(32,32,32,32);errorView.setText("Tidak dapat memuat GarasiKu. Periksa koneksi internet lalu ketuk untuk memuat ulang.");errorView.setVisibility(View.GONE);root.addView(webView,new FrameLayout.LayoutParams(-1,-1));root.addView(progress,new FrameLayout.LayoutParams(-1,5));root.addView(errorView,new FrameLayout.LayoutParams(-1,-1));errorView.setOnClickListener(v->{errorView.setVisibility(View.GONE);webView.reload();});setContentView(root);}
 private void configureWebView(){WebSettings s=webView.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setLoadWithOverviewMode(true);s.setUseWideViewPort(true);s.setDefaultTextEncodingName("UTF-8");s.setJavaScriptCanOpenWindowsAutomatically(true);s.setSupportMultipleWindows(false);s.setMediaPlaybackRequiresUserGesture(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setCacheMode(WebSettings.LOAD_DEFAULT);CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(webView,true);webView.setOverScrollMode(View.OVER_SCROLL_NEVER);webView.setBackgroundColor(Color.rgb(9,13,22));
  webView.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();String h=u.getHost()==null?"":u.getHost();if("https".equalsIgnoreCase(u.getScheme())&&(h.equals("andamasnoffice-collab.github.io")||h.endsWith(".firebaseio.com")||h.endsWith(".googleapis.com")||h.endsWith(".google.com")||h.endsWith(".telegram.org")))return false;if("https".equalsIgnoreCase(u.getScheme())||"mailto".equalsIgnoreCase(u.getScheme())||"tel".equalsIgnoreCase(u.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(ActivityNotFoundException ignored){}return true;}return true;}@Override public void onPageStarted(WebView v,String u,Bitmap b){errorView.setVisibility(View.GONE);progress.setVisibility(View.VISIBLE);}@Override public void onPageFinished(WebView v,String u){progress.setVisibility(View.GONE);}@Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame()){progress.setVisibility(View.GONE);errorView.setVisibility(View.VISIBLE);}}});
  webView.setWebChromeClient(new WebChromeClient(){@Override public void onProgressChanged(WebView v,int n){progress.setProgress(n);progress.setVisibility(n>=100?View.GONE:View.VISIBLE);}@Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams p){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;try{startActivityForResult(p.createIntent(),FILE_CHOOSER_REQUEST);return true;}catch(ActivityNotFoundException e){fileCallback=null;return false;}}@Override public void onPermissionRequest(PermissionRequest r){runOnUiThread(()->r.deny());}});
 }
 @Override protected void onActivityResult(int q,int result,Intent data){super.onActivityResult(q,result,data);if(q==FILE_CHOOSER_REQUEST&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileCallback=null;}}
 @Override protected void onSaveInstanceState(Bundle b){webView.saveState(b);super.onSaveInstanceState(b);}
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);if(webView!=null){webView.stopLoading();webView.destroy();}super.onDestroy();}
}