package edu.byuh.cis.mybattleshipwar.graphics;

import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import edu.byuh.cis.mybattleshipwar.R;

public class Airplane extends Enemy {

    public Airplane(Resources res, float screenWidth, float screenHeight) {
        super(screenWidth,screenHeight);
        /** instantiate each size of the airplanes, load & resize it*/
        int bigAirplaneSize = (int) (screenWidth * 0.07);
        int mediumAirplaneSize = (int) (screenWidth * 0.06);
        int littleAirplaneSize = (int) (screenWidth * 0.03);
        /** use if statements to give the logic to the random size number*/
        if (size == BIG) {
            img = BitmapFactory.decodeResource(res, R.drawable.big_airplanetika);
            img = Bitmap.createScaledBitmap(img, bigAirplaneSize, bigAirplaneSize, true);
        } else if (size == MED) {
            img = BitmapFactory.decodeResource(res, R.drawable.medium_airplanetika);
            img = Bitmap.createScaledBitmap(img, mediumAirplaneSize, mediumAirplaneSize, true);
        } else if (size == SMALL) {
            img = BitmapFactory.decodeResource(res, R.drawable.little_airplane_tika);
            img = Bitmap.createScaledBitmap(img, littleAirplaneSize, littleAirplaneSize, true);
        }

        /** set the bounds to prevent off-screen checks to fail */
        bounds.set(screenWidth, 0, screenWidth + img.getWidth(), img.getHeight());

        /** instantiate the velocity for airplane */
        velocity.x = (float)(-5 - Math.random()*10); //it will move to the left
        velocity.y = 0;
    }

    /** Override the move method to randomize the velocity, adding speed and resetting the object when it goes off screen */
    @Override
    public void move() {
        /** 10% chance to change speed */
        if (Math.random() < 0.1) {
            velocity.x = (float)(-5 - Math.random()*10);
            velocity.y = (float)(-2 + Math.random()*4); // random between -2 and +2
        }
        //move normal speed
        super.move();

        /** resetting when it goes off-screen */
        if (bounds.right < 0) {
            float y = (float)(Math.random() * (screenHeight/4 - img.getHeight()));
            setLocation(screenWidth, y);
        }

        /** make sure the airplane not goes to up (out of screen) */
        if (bounds.top < 0 || bounds.bottom > screenHeight/4) {
            velocity.y = -velocity.y; // bounce
        }
    }
}
