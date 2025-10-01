package edu.byuh.cis.mybattleshipwar.ui;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Handler;
import android.os.Message;
import android.view.View;

import edu.byuh.cis.mybattleshipwar.graphics.Airplane;
import edu.byuh.cis.mybattleshipwar.graphics.Battleship;
import edu.byuh.cis.mybattleshipwar.R;
import edu.byuh.cis.mybattleshipwar.graphics.Submarine;

/**
 * The BattleView is where the drawing and running of the game will happen
 */
public class BattleView extends View {

    public class Fire extends Handler {

        public Fire() {
            super();
            sendMessageDelayed(obtainMessage(),1000);
        }

        @Override
        public void handleMessage(Message m) {
            bigAirplane.move();
            mediumAirplane.move();
            littleAirplane.move();
            bigSubmarine.move();
            mediumSubmarine.move();
            littleSubmarine.move();
            ship.move();
            invalidate();  //this will force the display to refresh
            sendMessageDelayed(obtainMessage(),100);
        }
    }

    private Battleship ship;
    private Airplane bigAirplane, mediumAirplane, littleAirplane;
    private Submarine bigSubmarine, mediumSubmarine, littleSubmarine;
    private boolean init;
    private float shipX, shipY;
    private Paint whitePaint;
    private Bitmap water;

    private Fire fire;

    /** This is the constructor */
    public BattleView (Context c) {
        super(c);
        init = false;
        whitePaint = new Paint();
        whitePaint.setColor(Color.WHITE);
    }

    /** This is the simple factory, method to encapsulates object creation, so the BitmapFactory not scattered everywhere */
    private Bitmap loadBitmap(int resId, int size) {
        Bitmap load = BitmapFactory.decodeResource(getResources(), resId);
        return Bitmap.createScaledBitmap(load, size, size, true);
    }

    /**
     * This draw method handles the drawing for the view
     * It sets up and draws the object onto the canvas
     */
    @Override
    public void onDraw(Canvas c) {
        c.drawColor(Color.WHITE);
        /** Get the width and height of the view screen */
        float w = getWidth();
        float h = getHeight();
        /** the init help the runtime faster */
        if (init == false) {
            /** Initialize sizes and positions of each object so they look "relatively" the same on different screen sizes */
            int shipSize = (int) (w * 0.20);
            /** instantiate the ship */
            shipX = (w-shipSize)/2;
            shipY = (h-shipSize)/2;
            ship = new Battleship(getResources(), w);
            ship.setLocation(shipX,shipY);
            /** instantiate the big airplane */
            bigAirplane = new Airplane(getResources(),w,h);
            bigAirplane.setLocation(shipX+(w*0.30f),shipY-(w*0.105f));
            /** instantiate the medium airplane */
            mediumAirplane = new Airplane(getResources(),w,h);
            mediumAirplane.setLocation(shipX+(w*0.01f),shipY-(w*0.067f));
            /** instantiate the little airplane */
            littleAirplane = new Airplane(getResources(),w,h);
            littleAirplane.setLocation(shipX-(w*0.15f),shipY-(w*0.090f));
            /** instantiate the big submarine */
            bigSubmarine = new Submarine(getResources(),w,h);
            bigSubmarine.setLocation(shipX+(w*0.080f),shipY+(w*0.18f));
            /** instantiate the medium submarine */
            mediumSubmarine = new Submarine(getResources(),w,h);
            mediumSubmarine.setLocation(shipX+(w*0.16f),shipY+(w*0.25f));
            /** instantiate the little submarine */
            littleSubmarine = new Submarine(getResources(),w,h);
            littleSubmarine.setLocation(shipX-(w*0.20f),shipY+(w*0.22f));
            /** instantiate the water */
            int waterSize = (int) (w*0.014);
            water = loadBitmap(R.drawable.watertika,waterSize);

            /** instantiate the handler to force the display to refresh */
            fire = new Fire();

            init = true;
        }
        /**  Draw the water background using for loop */
        for (int x = 0; x <= w; x += (int)(w*0.014)) {
            c.drawBitmap(water,x,(int)(h * 0.62f),whitePaint);
        }
        /** draw the rest of the objects in the correct position (relative values) */
        ship.draw(c);
        bigAirplane.draw(c);
        mediumAirplane.draw(c);
        littleAirplane.draw(c);
        bigSubmarine.draw(c);
        mediumSubmarine.draw(c);
        littleSubmarine.draw(c);
    }
}
