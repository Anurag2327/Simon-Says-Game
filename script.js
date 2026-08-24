let gameSeq=[];
let userSeq=[];

let started=false;
let level=0;
let btnColor=["red","yellow","violet","green"];

let h2=document.querySelector("h2");

let body=document.querySelector("body");
let startbtn = document.querySelector(".start");

startbtn.addEventListener("click",function(){
    if(started==false){
        console.log("Game started");
        started=true;
        levelUp();
    }
});
function gameFlash(clr){
    clr.classList.add("flash");
    setTimeout(()=>{
        clr.classList.remove("flash");
    },400);
}

function userFlash(clr){
    clr.classList.add("userflash");
    setTimeout(()=>{
        clr.classList.remove("userflash");
    },250);
}

function checkAns(idx){
    if(userSeq[idx]===gameSeq[idx]){
        if(userSeq.length==gameSeq.length){
            setTimeout(()=>{levelUp()},1000);
        }
    }
    else {
        
        h2.innerHTML = ` Game over <b> Your score is ${level} </b>. <br>`;
        h2.append(startbtn);
        
        
        body.classList.add("red");
        setTimeout(()=>{body.classList.remove("red")},200);
        reset();
    }
}

function btnPress(){
    let btn=this;
    userFlash(btn);

    let userColor=btn.getAttribute("id");

    userSeq.push(userColor);
   
    checkAns(userSeq.length-1);
   
}


function levelUp(){
    userSeq=[];
    level++;
    h2.innerText=`Level ${level}`;
    let randIdx=Math.floor(Math.random()*4);
    let randColor=btnColor[randIdx];
    let randClr=document.querySelector(`.${randColor}`);
    gameSeq.push(randColor);

    gameFlash(randClr);

}

let btns=document.querySelectorAll(".btn");
for(btn of btns){
    btn.addEventListener("click",btnPress);
}

function reset(){
    gameSeq=[];
    userSeq=[];
    started=false;
    level=0;
}