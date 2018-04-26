// we have access to io variable becuase we have loaded in the io library in our index.html
let socket = io.connect('http://localhost:3000');

const userList = document.getElementById("users");
const messagesDiv = document.getElementById("messageslist");
const textarea = document.getElementById("newmessage");
const ding = new Audio('typewriter_ding.m4a');

// this will be the list of all messages displayed on the client
let messages = [{timestamp: 0}];

let name = window.prompt("Enter your name");
// if they didn't type anything at the prompt, make up a random name
if(name.length===0) name = "Anon-" + Math.floor(Math.random()*1000);

// add the sender and text of one new message to the bottom of the message list
function appendMessage(msg) {
    messages.push(msg);
    messagesDiv.innerHTML +=
      `<div class="message"><strong>${msg.sender}</strong><br>${msg.message}</div>`;
}

// redraw the entire list of users, indicating active/inactive
function listUsers(users) {
    let userStrings = users.map((user) =>
        (user.active ? `<span class="active"><span class="cyan">&#9679;</span> ${user.name}</span>` : `<span class="inactive">&#9675; ${user.name}</span>`)
    );
    userList.innerHTML = userStrings.join("<br>");
}

// true if the messages div is already scrolled down to the latest message
function scrolledToBottom() {
    return messagesDiv.scrollTop + 600 >= messagesDiv.scrollHeight;
}

// force the messages div to scroll to the latest message
function scrollMessages() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function fetchMessages() {
    fetch("/messages?for=" + encodeURIComponent(name))
        .then(response => response.json())
        .then(data => {
            // if already scrolled to bottom, do so again after adding messages
            const shouldScroll = scrolledToBottom();
            var shouldDing = false;

            // redraw the user list
            listUsers(data.users);

            // examine all received messages, add those newer than the last one shown
            for(let i = 0; i < data.messages.length; i++){ 
                let msg = data.messages[i];
                if(msg.timestamp > messages[messages.length-1].timestamp) {
                    appendMessage(msg);
                    shouldDing = true;
                }
            }
            if(shouldScroll && shouldDing) scrollMessages();
            if(shouldDing) ding.play();

            // poll again after waiting 5 seconds
            setTimeout(fetchMessages, 5000);
        })
}

let changes = 0;
document.getElementById("newmessage").addEventListener("keypress", (event) => {
    // here is where we will emit real-time text
    console.log("event", event);
    socket.emit('typing', { sender: name, message: textarea.value, changes });
    changes++;
    // if the key pressed was enter (and not shift enter), post the message.
    if(event.keyCode === 13 && !event.shiftKey) {
        changes = 0;
        textarea.disabled = true;
        scrollMessages();
        // reset the textarea
        textarea.value="";
        textarea.disabled = false;
        textarea.focus();
    }
})

// Listen for events
socket.on('typing', data => {
    console.log(data);
    if (!data.changes) {
        messagesDiv.innerHTML +=
            `<div class="message"><strong>${data.sender}</strong><br>${data.message}</div>`;
    } else {
        messagesDiv.lastChild.innerHTML = `<strong>${data.sender}</strong><br>${data.message}`;
    }
});




// call on startup to populate the messages and start the polling loop
fetchMessages();