package com.lotuzxvan.sampoerna.sandbox;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.widget.*;
import android.net.http.SslError;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String SITE="https://sampoerna-corporate-workspace.lotuzxvan.chatgpt.site/";
    private static final String HOST="sampoerna-corporate-workspace.lotuzxvan.chatgpt.site";
    private WebView web;
    private TextView error;
    private Button retry;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingExport;
    private boolean allowed(Uri uri) { return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && (uri.getPort()==-1 || uri.getPort()==443); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);root.setFitsSystemWindows(true);
        error=new TextView(this);error.setTextSize(16);error.setPadding(24,24,24,12);error.setVisibility(View.GONE);root.addView(error);
        retry=new Button(this);retry.setText("Retry");retry.setVisibility(View.GONE);root.addView(retry);
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true); // Required for user-selected document uploads.
        settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUserAgentString(settings.getUserAgentString()+" SampoernaAndroid/0.2.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(false);
        retry.setOnClickListener(v->{error.setVisibility(View.GONE);retry.setVisibility(View.GONE);web.loadUrl(SITE);});
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){return navigate(req.getUrl(),req.isForMainFrame());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,String url){return navigate(Uri.parse(url),true);}
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError ssl){handler.cancel();showError("Secure connection failed. Check your device time and internet connection.");}
            @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError detail){if(req.isForMainFrame())showError("Unable to load banking. Check your internet connection and tap Retry.");}
            @Override public void onPageFinished(WebView view,String url){CookieManager.getInstance().flush();}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);
                fileCallback=callback;
                Intent picker=new Intent(Intent.ACTION_OPEN_DOCUMENT);picker.addCategory(Intent.CATEGORY_OPENABLE);picker.setType("*/*");
                try{startActivityForResult(picker,100);}catch(RuntimeException ex){fileCallback.onReceiveValue(null);fileCallback=null;showError("No file picker is available on this device.");}return true;
            }
        });
        // No ACTION_VIEW, Custom Tab, external browser or JavaScript-to-native bridge.
        // Reload protected content after activity recreation; do not restore sensitive page snapshots.
        web.loadUrl(SITE);
    }
    private boolean navigate(Uri uri,boolean mainFrame){
        if(allowed(uri))return false;
        if(mainFrame && "sampoerna-download".equals(uri.getScheme()) && "csv".equals(uri.getHost()) && web.getUrl()!=null && allowed(Uri.parse(web.getUrl()))){
            String text=uri.getQueryParameter("text"),name=uri.getQueryParameter("name");
            if(text==null || text.length()>5_000_000 || pendingExport!=null){Toast.makeText(this,"Export is too large or another save is pending.",Toast.LENGTH_LONG).show();return true;}
            pendingExport=text.getBytes(StandardCharsets.UTF_8);
            Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);save.addCategory(Intent.CATEGORY_OPENABLE);save.setType("text/csv");save.putExtra(Intent.EXTRA_TITLE,name==null?"report.csv":name.replaceAll("[^A-Za-z0-9._-]","_"));
            try{startActivityForResult(save,101);}catch(RuntimeException ex){pendingExport=null;showError("No file saver is available on this device.");}return true;
        }
        if(mainFrame)Toast.makeText(this,"This external link is not available inside the banking app.",Toast.LENGTH_LONG).show();
        return true;
    }
    private void showError(String text){error.setText(text);error.setVisibility(View.VISIBLE);retry.setVisibility(View.VISIBLE);}
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==100 && fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK && data!=null && data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}
        if(request==101){
            if(result==RESULT_OK && data!=null && data.getData()!=null && pendingExport!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new java.io.IOException();out.write(pendingExport);Toast.makeText(this,"Report saved",Toast.LENGTH_SHORT).show();}catch(Exception ex){showError("Could not save the report. Please try again.");}}
            pendingExport=null;
        }
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);pendingExport=null;web.destroy();super.onDestroy();}
}
