package edu.byuh.cis.mybattleshipwar.graphics;

import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import edu.byuh.cis.mybattleshipwar.R;

public class Submarine extends Enemy {

    public Submarine(Resources res, float screenWidth, float screenHeight) {
        super(screenWidth,screenHeight);
        /** instantiate each size of the submarines, load & resize it*/
        int bigSubmarineSize = (int) (screenWidth * 0.08);
        int mediumSubmarineSize = (int) (screenWidth * 0.05);
        int littleSubmarineSize = (int) (screenWidth * 0.03);
        //use if statements to give the logic to the random size number
        if (size == BIG) {
            img = BitmapFactory.decodeResource(res, R.drawable.big_submarinetika);
            img = Bitmap.createScaledBitmap(img, bigSubmarineSize, bigSubmarineSize, true);
        } else if (size == MED) {
            img = BitmapFactory.decodeResource(res, R.drawable.medium_submarinetika);
            img = Bitmap.createScaledBitmap(img, mediumSubmarineSize, mediumSubmarineSize, true);
        } else if (size == SMALL) {
            img = BitmapFactory.decodeResource(res, R.drawable.little_submarinetika);
            img = Bitmap.createScaledBitmap(img, littleSubmarineSize, littleSubmarineSize, true);
        }

        /** set the bounds to prevent off-screen checks to fail */
        bounds.set(screenWidth, 0, screenWidth + img.getWidth(), img.getHeight());

        /** instantiate the velocity for airplane */
        velocity.x = (float)(5 - Math.random()*10); // move to the right
        velocity.y = 0;
    }

    /** Override the move method to randomize the velocity, adding speed and resetting the object when it goes off screen */
    @Override
    public void move() {
        // 10% chance to speed up
        if (Math.random() < 0.1) {
            velocity.x = (float) (5 + Math.random() * 10);
            velocity.y = (float)(-2 + Math.random()*4); // small up/down drift
        }
        // move normal
        super.move();

        // resetting the position when it goes off screen
        if (bounds.left > screenWidth) {
            float y = (float)(screenHeight * 0.7 + Math.random() * (screenHeight*0.3 - img.getHeight()));
            setLocation(-img.getWidth(), y);
        }

        //make sure subs not goes to down (out off screen)
        float minY = (float)(screenHeight * 0.7);            // water surface
        float maxY = screenHeight - img.getHeight();           // bottom limit

        if (bounds.top < minY) {
            setLocation(bounds.left, minY);
            if (velocity.y < 0) {
                velocity.y = -velocity.y; // flip upward motion to downward
            }
        } else if (bounds.top > maxY) {
            setLocation(bounds.left, maxY);
            if (velocity.y > 0) {
                velocity.y = -velocity.y; // flip downward motion to upward
            }
        }
    }
}
