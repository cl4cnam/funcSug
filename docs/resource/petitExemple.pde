int restartState = 0;
String reponse = "Choisis ta question !";
 
void setup() {
  size(800, 600); 
}

void dessinerBoutons() {
  background(255);
  fill(192);
  rect(10, 80, 200, 50);
  rect(250, 80, 200, 50);
  rect(100, 150, 200, 50);
}

void dessinerTextes(int restartState, String reponse) {
  fill(0);
  text(reponse, 20, 40);
  fill(128*restartState);
  text("Que met-on sur les pieds ?", 20, 110);
  text("Que met-on sur les mains ?", 260, 110);
  fill(128 - 128*restartState);
  text("Restart", 110, 180);  
}

boolean bouton1_est_clique() {
  return mousePressed == true && mouseY >= 80 && mouseY <= 130 && mouseX >= 10 && mouseX <= 210;
}

boolean bouton2_est_clique() {
  return mousePressed == true && mouseY >= 80 && mouseY <= 130 && mouseX >= 250 && mouseX <= 450;
}

boolean boutonRestart_est_clique() {
  return mousePressed == true && mouseY >= 150 && mouseY <= 200 && mouseX >= 100 && mouseX <= 300;
}

void draw() {
  dessinerBoutons();
  
  if (bouton1_est_clique() && restartState == 0) {
    reponse = "Des chaussettes";
    restartState = 1;
  } else if (bouton2_est_clique() && restartState == 0) {
    reponse = "Des gants";
    restartState = 1;
  } else if (boutonRestart_est_clique() && restartState == 1) {
    reponse = "Choisis ta question !";
    restartState = 0;
  }
  
  dessinerTextes(restartState, reponse);
}
