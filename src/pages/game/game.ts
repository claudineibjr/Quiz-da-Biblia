import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { User } from '../../model/User';
import { Question } from '../../model/Question';
import { Parameters } from '../../model/Parameters';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import { AlertController } from 'ionic-angular';
import { NativeAudio } from '@ionic-native/native-audio';

@Component({
  selector: 'page-game',
  templateUrl: 'game.html'
})

export class GamePage {

  question: Question;
  match: game.Match;
  time_Left_Question: number;
  run_stopWatch: boolean;
  //stopWatch_color: string;
  
  image: Array<String> = [];

  constructor(  public navCtrl: NavController, public db: AngularFireDatabase,
                public alertCtrl: AlertController, public nativeAudio: NativeAudio) {
    
    //Cria as alternativas em branco para que apareça o espaço em branco
    let auxAlternatives: Array<String> = [];
    auxAlternatives.push("");
    auxAlternatives.push("");
    auxAlternatives.push("");
    auxAlternatives.push("");
    
    // Seta a questão como nula, para que não dê erro, visto que é MVVM
    this.question = new Question(null, null, null, auxAlternatives, null, null, null, null, null);
    
    //Chama a função responsável por buscar a questão no banco de dados
    this.getQuestion();

    // Instancia uma nova partida
    this.match = new game.Match();

    //Prepara o áudio para acertos
    this.nativeAudio.preloadSimple('correctAudio', 'assets/sound/sound_correct_answer.mp3').then(mensagem => {
      console.log('Sucesso ao carregar o áudio (correctAudio) | ' + mensagem);
      }, erro => {
        console.log('Falha ao carregar o áudio (correctAudio) | ' + erro);
      });
    
    //Prepara o áudio para erros
    this.nativeAudio.preloadSimple('wrongAudio', 'assets/sound/sound_wrong_answer.mp3').then(mensagem => {
        console.log('Sucesso ao carregar o áudio(wrongAudio) | ' + mensagem);
      }, erro => {
        console.log('Falha ao carregar o áudio (wrongAudio) | ' + erro);
      });
    
    // Inicia o cronômetro
    this.run_stopWatch = true;
    this.startTimer();
  }

  getStopWatchImage(){
    switch(this.time_Left_Question){
      case 20: case 19: case 18:
        return 'assets/img/stopwatch/0-8.png';
      case 17: case 16:
        return 'assets/img/stopwatch/1-8.png';
      case 15: case 14:
        return 'assets/img/stopwatch/2-8.png';
      case 13: case 12: case 11:
        return 'assets/img/stopwatch/3-8.png';
      case 10: case 9: case 8:
        return 'assets/img/stopwatch/4-8.png';
      case 7: case 6:
        return 'assets/img/stopwatch/5-8.png';
      case 5: case 4:
        return 'assets/img/stopwatch/6-8.png';
      case 3: case 2:
        return 'assets/img/stopwatch/7-8.png';
      case 1: case 0:
        return 'assets/img/stopwatch/8-8.png';
    }
  }

  startTimer(){
    // Função responsável por passar o tempo restante para responder a questão
    setTimeout(() => {
      // Só decrementa caso o contador esteja rodando
      if (this.run_stopWatch){
        this.time_Left_Question -= 1;

        /*// Colore de laranja, vermelho ou preto de acordo com o tempo restante
        if (this.time_Left_Question <= 5)
          this.stopWatch_color = "red";
        else if (this.time_Left_Question <= 10)
          this.stopWatch_color = "orange";
        else
          this.stopWatch_color = "black";*/

        if (this.time_Left_Question == 0){
          // Acabou o tempo, o usuário não conseguiu responder a questão
          this.try(-1);
        }
      }

      // Decrementa o contador e continua contando
      this.startTimer();
    }, 1000);

  }

  try(selectedAlternative: number){
    // Função acionada no fim da questão ou quando o usuário seleciona a opção   

    // Pára o cronômetro
    this.run_stopWatch = false;

    //Variável responsável por identificar se o usuário acertou ou errou
    let correct: boolean;
    correct = selectedAlternative == this.question.getAnswer();
    
    // Variável local que exibirá a pontuação obtida com esta questão
    let scoreTry: number = 0;

    // Insere uma nova resposta na partida
    this.match.answers.push(new game.Answer(correct, this.question.getLevelQuestion()));

    // Reproduz som
    this.playSound(correct);

    // Pinta a alternativa de acordo com a resposta correta ou não
    this.paintAlternative(correct, this.question.getAnswer(), selectedAlternative);

    if (correct){
      
      // Soma a variável de acertos seguidos da partida
      this.match.hit++;
      
      // Caso a questão for difícil, soma a variável de acertos difíceis seguidos
      if (this.question.getLevelQuestion() == 3)
        this.match.hit_Hard++;

      // Soma pontuação por dificuldade
      switch (this.question.getLevelQuestion()){
          case 3: {
              scoreTry += Parameters.POINTS_HIT_HARD;
              break;
          }
          case 2: {
              scoreTry += Parameters.POINTS_HIT_MEDIUM;
              break;
          }
          case 1: {
              scoreTry += Parameters.POINTS_HIT_EASY;
              break;
          }
      }

      // Soma pontuação por tempo
      scoreTry += (this.time_Left_Question >= 15 ? 
                                Parameters.POINTS_TIME_19_15 : 
                                (this.time_Left_Question <= 14 && this.time_Left_Question >= 10 ? 
                                  Parameters.POINTS_TIME_14_10 : 
                                  (this.time_Left_Question <= 9 && this.time_Left_Question >= 5 ? 
                                    Parameters.POINTS_TIME_9_5 : 
                                    (this.time_Left_Question <= 4 ? 
                                      Parameters.POINTS_TIME_4_0 : 
                                      0)
                                    )
                                  )
                            );

    }else{
      
      // Zera a variável de acertos seguidos da partida
      this.match.hit = 0;

      // Zera a variável de acertos difíceis seguidos da partida 
      if (this.question.getLevelQuestion() == 3)
          this.match.hit_Hard = 0;

      // Decrementa pontuação por erro
      scoreTry += Parameters.POINTS_WRONG;

      // Decrementa pontuação por dificuldade
      switch (this.question.getLevelQuestion()){
          case 3: {
              scoreTry += Parameters.POINTS_WRONG_HARD;
              break;
          }
          case 2: {
              scoreTry += Parameters.POINTS_WRONG_MEDIUM;
              break;
          }
          case 1: {
              scoreTry += Parameters.POINTS_WRONG_EASY;
              break;
          }
      }      
    }

    // Exibe a resposta na tela
    this.showAnswer(correct, this.question.getTextBiblical(), scoreTry);

    // Soma a pontuação obtida nesta tentativa à pontuação da partida
    this.match.score += scoreTry;

    // Verifica a sequência de acertos e dá os bônus caso necessário
    this.verifySequenceQuestions();

  }

  showAnswer(correct: boolean, textBiblical: string, points: number){
    // Exibe uma mensagem com a pontuação, o resultado da questão e texto bíblico

    let alert = this.alertCtrl.create({
      title: (correct ? 'Parabéns, você acertou!' : 'Que pena, você errou!'),
      subTitle: points + " pontos.",
      message: '<font color="black">' + textBiblical + '</font>',
      enableBackdropDismiss: false,
      cssClass: (correct ? 'correct-answer' : 'wrong-answer'),
      buttons: [
        {
          text: 'Ok',
          handler: () => {
            // Carrega a próxima questão
            this.getQuestion();
          }
        }
      ]
    });

    alert.present();

  }

  playSound(correct: boolean){
    // Reproduz som
    if (correct){      
      this.nativeAudio.play('correctAudio', () => console.log("Rodou"));
    }else{
      this.nativeAudio.play('wrongAudio', () => console.log("Rodou"));
    }
  }
  

  paintAlternative(correct: boolean, answer: number, selectedAlternative: number){
    // Pinta a alternativa de acordo com a resposta correta ou não

    if (selectedAlternative == -1){
      // Se for -1 significa que o tempo acabou, pinta todas de vermelho
      (<HTMLImageElement>document.getElementsByClassName("frameAlternative")[0]).src = 'assets/img/quadro_alternativa_incorreta.png';
      (<HTMLImageElement>document.getElementsByClassName("frameAlternative")[1]).src = 'assets/img/quadro_alternativa_incorreta.png';
      (<HTMLImageElement>document.getElementsByClassName("frameAlternative")[2]).src = 'assets/img/quadro_alternativa_incorreta.png';
      (<HTMLImageElement>document.getElementsByClassName("frameAlternative")[3]).src = 'assets/img/quadro_alternativa_incorreta.png';

    }else{
      let imageSelectedAlternative: HTMLImageElement = <HTMLImageElement>document.getElementsByClassName("frameAlternative")[selectedAlternative];
      
      if (correct)
        imageSelectedAlternative.src = 'assets/img/quadro_alternativa_correta.png';
      else
        imageSelectedAlternative.src = 'assets/img/quadro_alternativa_incorreta.png';

    }

  }

  getQuestion(){
    //Função acionada ao buscar uma questão aleatória

    // Carrega novamente o tempo restante para responder à questão
    this.time_Left_Question = Parameters.TIME_QUESTION;

    let questionNumber: number;
    questionNumber = this.aleatoryNumberQuestion();

    //Cria as variáveis locais apenas para armazenar temporariamente os dados antes de criar a questão
    let alternatives: Array<String>,
        idQuestion: number, strQuestion: string, answer: string, textBiblical: string, 
        levelQuestion: number, testamento: string, secaoBiblia: string, referenciaBiblica: string;

    //Busca a questão selecionada no banco de dados
    this.db.list('/question/' + questionNumber, { preserveSnapshot: true }).subscribe(snapshots => {
      snapshots.forEach(snapshot =>{

        switch(snapshot.key){
          case 'alternatives': {      alternatives = snapshot.val();      break;  }
          case 'answer': {            answer = snapshot.val();            break;  }
          case 'idQuestion': {        idQuestion = snapshot.val();        break;  }
          case 'levelQuestion': {     levelQuestion = snapshot.val();     break;  }
          case 'question': {          strQuestion = snapshot.val();       break;  }
          case 'referenciaBiblica': { referenciaBiblica = snapshot.val(); break;  }
          case 'secaoBiblia': {       secaoBiblia = snapshot.val();       break;  }
          case 'testamento': {        testamento = snapshot.val();        break;  }
          case 'textBiblical': {      textBiblical = snapshot.val();      break;  }
        }
      });

      // Chamada de função que troca a ordem das questões e também altera o índice da resposta correta para identificá-la posteriormente
      let alternatives_and_answer: Array<Object> = [];
      alternatives_and_answer.push(answer);
      alternatives_and_answer.push(alternatives);
      alternatives_and_answer = this.randomizeAlternatives(alternatives_and_answer);

      //Instancia a nova questão
      this.question = new Question( idQuestion, strQuestion, parseInt(<string> alternatives_and_answer[0]), 
                                    <Array<string>> alternatives_and_answer[1], textBiblical, levelQuestion, 
                                    testamento, secaoBiblia, referenciaBiblica);

      this.run_stopWatch = true;
    });
  }

  aleatoryNumberQuestion(): number{
    let maxNumberQuestion_Debug: number = 129;
    return Math.floor(Math.random() * (maxNumberQuestion_Debug - 1)) + 1;
  }

  randomizeAlternatives(alternatives_and_answer: Array<Object>): Array<Object>{
    let randomizedList: Array<number> = [];
    let transitions_To: Array<Number> = [];

    for (let iCount: number = 0; iCount <=3; iCount++){

      let randomOk: boolean = false;

      // Enquanto não tiver sorteado aleatório, realiza um novo sorteio
      while (!randomOk){
        
        // Gera o número aleatório entre 0 e 3
        let randomizedNumber: number = Math.floor(Math.random() * 4);

        // Verifica se a lista está vazia, caso esteja, insere, caso não esteja, verifica se o número sorteado está na lista
        if (randomizedList.length > 0){

          //Verifica se o número que foi sorteado já não havia sido inserido na lista
          if (!this.existOnList(randomizedList, randomizedNumber)){
            // Insere o número aleatório na lista
            transitions_To.push(randomizedNumber);
            randomizedList.push(randomizedNumber);
            randomOk = true;
            
          }
        }else{
          // Insere o número aleatório na lista
          transitions_To.push(randomizedNumber);
          randomizedList.push(randomizedNumber);
          randomOk = true;
        }
      }
    }

    // Verifica para qual alternativa na ordem ficou a resposta correta
    for (let iCount: number = 0; iCount <= 3; iCount++){
      if (transitions_To[iCount] == alternatives_and_answer[0]){
        alternatives_and_answer[0] = iCount;
        break;
      }
    }

    // Utiliza um array auxiliar para alterar as alternativas
    let alternatives_aux: Array<string> = [];
    for (let iCount: number = 0; iCount <= 3; iCount++){
      alternatives_aux[iCount] = alternatives_and_answer[1][randomizedList[iCount]];
    }
    alternatives_and_answer[1] = alternatives_aux;

    return alternatives_and_answer;
  }

  existOnList(list: Array<Object>, object: Object): boolean{
    // Verifica se o objeto passado como parâmetro existe na lista
    for (let i: number = 0; i < list.length; i++){
      if (list[i] == object)
        return true;
    }

    return false;
  }

  verifySequenceQuestions(): void{
    // 10 questões seguidas (1 aleatório)
    // 5 difíceis seguidas (1 aleatório)

    if (this.match.hit >= Parameters.HITS_POWERUP) {
        this.winPowerUP();
        this.match.hit = 0;
    }
    if (this.match.hit_Hard >= Parameters.HITS_HARD_POWERUP){
        this.winPowerUP();
        this.match.hit_Hard = 0;
    }    
  }

  winPowerUP(){
    /*
        Random random = new Random();

        int powerUPSorteado = random.nextInt(3);

        String mensagem = "Parabéns, você ganhou 1 PowerUP de ";

        switch (powerUPSorteado) {
            case 0: {
                mensagem += "tempo.";
                usuario.getBonus().setBonusTempo(1);
                break;
            }

            case 1: {
                mensagem += "eliminação de alternativa incorreta.";
                usuario.getBonus().setBonusAlternativa(1);
                break;
            }

            case 2: {
                mensagem += "exibição da referência bíblia.";
                usuario.getBonus().setBonusReferenciaBiblica(1);
                break;
            }
        }

        Snackbar.make(findViewById(R.id.activity_jogo), mensagem, Snackbar.LENGTH_LONG).show();

        FirebaseDB.getUsuarioReferencia().child(usuario.getUid()).setValue(usuario);    
    */
  }

}

module game{

  export class Match {
    public score: number = 0;
    public time_left: number = 120;
    public answers: Array<Answer> = [];
    public hit: number = 0;
    public hit_Hard: number = 0;  
  }

  export class Answer{
    private hit: boolean;
    private dificulty: number; //1 - Fácil     | 2 - Média | 3 - Difícil

    constructor(hit: boolean, dificulty: number) {
        this.hit = hit;
        this.dificulty = dificulty;
    }

    public isHit(): boolean {
        return this.hit;
    }

    public getDificulty(): number {
        return this.dificulty;
    }

    public toString(): string {
        return "Resposta{" +
                "acerto=" + this.hit +
                ", dificuldade=" + this.dificulty +
                '}';
    }
  }

}