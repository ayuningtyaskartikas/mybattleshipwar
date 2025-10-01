package edu.byuh.cis.mybattleshipwar.graphics;

import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import edu.byuh.cis.mybattleshipwar.R;

public class Battleship extends Sprite {

    private float screenWidth;
    public Battleship(Resources res, float screenWidth) {
        super();
        this.screenWidth = screenWidth;
        /** instantiate the battleship size, load & resize it*/
        int shipSize = (int) (screenWidth * 0.20);
        img = BitmapFactory.decodeResource(res, R.drawable.shiptika);
        img = Bitmap.createScaledBitmap(img, shipSize, shipSize, true);

        /** instantiate the velocity for battleship */
        velocity.x = 5; // the ship will move to the right first
        velocity.y = 0;
    }

    /** override the move method to make the ship move back and forth throughout the game */
    @Override
    public void move(){
        super.move();

        /** check the condition when the ship hit the edge of the screen it will change direction */
        if (bounds.left < 0) {
            velocity.x = -velocity.x; // reverse direction
        } else if (bounds.right > screenWidth*0.8) {
            velocity.x = -velocity.x; // reverse direction
        }
    }
}
