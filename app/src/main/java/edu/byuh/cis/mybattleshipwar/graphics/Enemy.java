package edu.byuh.cis.mybattleshipwar.graphics;

public abstract class Enemy extends Sprite {

    protected float screenWidth;
    protected float screenHeight;

    int size;
    /** The constants field to decide the enemy size */
    public static final int BIG = 0;
    public static final int MED = 1;
    public static final int SMALL = 2;

    public Enemy(float screenWidth, float screenHeight) {
        super();
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        /** instantiate the size, using math random to get number (0,1,2)*/
        size = (int)(Math.random()*3);
    }

    /** calling the super.move method, so it can be access by the enemy's subclasses */
    public void move() {
        super.move();
    }
}
