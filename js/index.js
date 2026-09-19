console.log("ready");


const $carresCategories = document.querySelectorAll('.cat');
const $carresNotes = document.querySelectorAll('.note');
const $iframe = document.querySelector('iframe');
const $iframeWrapper = document.getElementById('iframe-wrapper');
const $menuH2 = document.querySelector('#menu-right h2');
const $menuH3 = document.querySelector('#menu-right h3');


console.log($carresCategories);
console.log($carresNotes);
console.log($iframe);
console.log($menuH2);
console.log($menuH3);

$menuH2.addEventListener('click', () => {
    console.log("click menu h2");
    const url = $menuH2.dataset.url;
    if(url != ""){
        $iframe.src = url;
        $menuH3.classList.add('hidden');
        $menuH3.textContent = "";
    }
});

$carresCategories.forEach( ($carreCategorie)=>{
    $carreCategorie.addEventListener('click', ()=>{
        console.log("click catégorie");
        const url = $carreCategorie.dataset.url;
        console.log(url);
        const title = $carreCategorie.dataset.catname;
        console.log(title);
        //
        // charge l'iframe
        $iframe.src = url;
        $iframeWrapper.classList.remove("closed");
        $iframeWrapper.classList.add("opened");
        // on met le texte dans le h2 & on l'affiche
        $menuH2.textContent = title;
        $menuH2.dataset.url = url;
        $menuH2.classList.remove("hidden");
    });
} );

$carresNotes.forEach( ($carreNote)=>{
    $carreNote.addEventListener('click', ()=>{
        console.log("click note");
        const url = $carreNote.dataset.url;
        console.log(url);

        const cattitle = $carreNote.parentNode.querySelector('.cat').dataset.catname;
        const caturl = $carreNote.parentNode.querySelector('.cat').dataset.url;
        console.log(cattitle);

        const title = $carreNote.dataset.notename;
        console.log(title);
        //
        // charger l'iframe
        $iframe.src = url;
        $iframeWrapper.classList.remove("closed");
        $iframeWrapper.classList.add("opened");
        // on met le texte dans le h2 & on l'affiche
        $menuH2.textContent = cattitle;
        $menuH2.dataset.url = caturl;
        $menuH2.classList.remove("hidden");
        $menuH3.textContent = title;
        $menuH3.dataset.url = url;
        $menuH3.classList.remove("hidden");
    });
} );

// MESSAGE QUI VIENT DE L'IFRAME
window.addEventListener("message", (event) => {
    // Ensure the message is coming from the expected origin (same domain)
    if (event.origin !== window.location.origin) return;

    console.log("Message received from iframe:", event.data);
    const message = event.data.split("___");
    console.log(message);
    const title = message[0];
    console.log(title);
    const url = message[1];
    console.log(url);
    
    $menuH3.textContent = title;
    $menuH3.classList.remove('hidden');
    $iframe.src = url;

});


const $dedale = document.querySelector('#menu-left');
console.log("c'est le menu");

$dedale.addEventListener('click', () => {
    console.log("click menu dedale");

    $iframeWrapper.classList.remove('opened');
    $iframeWrapper.classList.add('closed');
    $menuH3.classList.add('hidden')
    $menuH2.classList.add('hidden')
    setTimeout(() => {
        $iframe.src = "";
    }, 500);
   
});

// SCROLLING DRAG & DROP
const $main = document.querySelector("main");
let isDown = false;
let startX, startY, scrollLeft, scrollTop;

$main.addEventListener("mousedown", (e) => {
    isDown = true; // true si souris enfoncée
    startX = e.pageX -  $main.offsetLeft;
    startY = e.pageY -  $main.offsetTop;
    scrollLeft =  $main.scrollLeft;
    scrollTop =  $main.scrollTop;

    $main.style.cursor = "grabbing"; // mettre un cursos approprié
});

$main.addEventListener("mouseup", () => {
    isDown = false; // false si souris relachée
    $main.style.cursor = "grab"; // remettre le curseur par défaut
});

$main.addEventListener("mousemove", (e) => {
    if (!isDown){
        // ne fait rien si la souris n'est pas enfoncée
        return;
    }
    e.preventDefault(); // empêche le comportement par défaut du navigateur
    const x = e.pageX -  $main.offsetLeft;
    const y = e.pageY -  $main.offsetTop;
    const walkX = (x - startX) * 2; // Adjust scrolling speed
    const walkY = (y - startY) * 2;
    $main.scrollLeft = scrollLeft - walkX; // Scroll the main element
    $main.scrollTop = scrollTop - walkY;
});