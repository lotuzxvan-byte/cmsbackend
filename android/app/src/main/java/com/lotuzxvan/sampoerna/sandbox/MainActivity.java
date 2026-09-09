package com.lotuzxvan.sampoerna.sandbox;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final Uri SITE = Uri.parse("https://sampoerna-corporate-workspace.lotuzxvan.chatgpt.site/");
    private TextView status;
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER_VERTICAL);
        int space = Math.round(24 * getResources().getDisplayMetrics().density);
        layout.setPadding(space, space, space, space);
        layout.setBackgroundColor(Color.WHITE);
        layout.setFitsSystemWindows(true);
        TextView title = new TextView(this);
        title.setText("Sampoerna Corporate");
        title.setTextSize(28);
        title.setTextColor(Color.rgb(191,34,49));
        layout.addView(title);
        status = new TextView(this);
        status.setText("Your banking workspace opens securely in your browser. Sign in with your registered account.");
        status.setTextSize(16);
        status.setPadding(0,space,0,space);
        status.setTextColor(Color.rgb(53,64,82));
        layout.addView(status);
        Button open = new Button(this);
        open.setText("Open banking workspace");
        open.setAllCaps(false);
        open.setMinHeight(Math.round(56 * getResources().getDisplayMetrics().density));
        open.setOnClickListener(v -> openWorkspace(true));
        layout.addView(open);
        Button fallback = new Button(this);
        fallback.setText("Open in browser");
        fallback.setAllCaps(false);
        fallback.setOnClickListener(v -> openWorkspace(false));
        layout.addView(fallback);
        TextView note = new TextView(this);
        note.setText("Unofficial sandbox · No real money moves.\nAn internet connection and a web browser are required.");
        note.setTextSize(14);
        note.setPadding(0,space,0,0);
        layout.addView(note);
        setContentView(layout);
        // Do not re-launch after rotation, browser return or process restoration.
        if (savedInstanceState == null) openWorkspace(true);
    }
    private void openWorkspace(boolean preferCustomTab) {
        try {
            if (preferCustomTab) {
                String provider = CustomTabsClient.getPackageName(this, Collections.emptyList());
                if (provider != null) {
                    CustomTabsIntent tab = new CustomTabsIntent.Builder()
                        .setShowTitle(true)
                        .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder()
                            .setToolbarColor(Color.rgb(191,34,49)).build()).build();
                    tab.intent.setPackage(provider);
                    tab.launchUrl(this, SITE);
                    status.setText("Workspace opened. Tap Open banking workspace to return to it.");
                    return;
                }
            }
            launchBrowser();
        } catch (RuntimeException failure) {
            // A provider may be disabled between discovery and launch.
            try { launchBrowser(); }
            catch (RuntimeException unavailable) {
                status.setText("No available browser could open the workspace. Enable or install Chrome or another browser, then tap Open banking workspace.");
            }
        }
    }
    private void launchBrowser() {
        Intent intent = new Intent(Intent.ACTION_VIEW, SITE);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        startActivity(intent);
        status.setText("Workspace opened in your browser. Return here to reopen it.");
    }
}
