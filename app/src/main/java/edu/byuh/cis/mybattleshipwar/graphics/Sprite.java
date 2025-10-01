package edu.byuh.cis.mybattleshipwar.graphics;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.PointF;
import android.graphics.RectF;

public abstract class Sprite {

    protected Bitmap img;
    protected RectF bounds;
    protected PointF velocity;

    public Sprite() {
        /** Instantiate the bounds for setting location*/
        bounds = new RectF();
        velocity = new PointF(0,0);
    }

    /** set location method that will be called in the view class*/
    public void setLocation(float x, float y) {

        bounds.offsetTo(x,y);
    }

    /** the draw method that will draw the image (called in the view class)*/
    public void draw(Canvas c) {

        c.drawBitmap(img, bounds.left, bounds.top, null);
    }

    /** Method to moves the sprite based on its velocity. */
    public void move() {

        bounds.offset(velocity.x,velocity.y);
    }
}
