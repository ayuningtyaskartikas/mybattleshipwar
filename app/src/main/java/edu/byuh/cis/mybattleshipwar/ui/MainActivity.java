package edu.byuh.cis.mybattleshipwar.ui;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.WindowInsetsCompat;

/** Activity works as the main screen of the game, sets up the view and shows it */

public class MainActivity extends AppCompatActivity {

    /** creating the BattleView here*/
    private BattleView bv;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bv = new BattleView(this);
        setContentView(bv);
    }
}