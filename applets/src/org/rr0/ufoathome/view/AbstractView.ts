export /*abstract*/
class AbstractView extends Canvas {
  public abstract displayBuffered(): void ;

  public abstract getBufferedGraphics(): Graphics;
}
