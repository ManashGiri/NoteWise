document.getElementById("chatForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const action = document.activeElement.value;

    const buttons = document.querySelectorAll(".search");
    buttons.forEach(btn => {
        btn.classList.add("disabled");
        btn.disabled = true;
    });

    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (!message) return;

    const chatBox = document.getElementById("chatBox");

    const welcomeMsg = document.getElementById("welcomeMessage");
    if (welcomeMsg) welcomeMsg.remove();

    //  User message
    const userMessage = document.createElement("div");
    userMessage.className = "message user";
    userMessage.textContent = message;
    chatBox.appendChild(userMessage);

    input.value = "";

    const loading = document.createElement('div');
    loading.classList.add('message', 'ai');
    loading.textContent = "AI is typing...";
    chatBox.appendChild(loading);
    loading.scrollIntoView({ behavior: 'smooth' });


    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, action })
        });

        if (response.status === 401) {
            const data = await response.json();
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        }

        const replyText = await response.text();

        if (replyText) {
            loading.remove();

            //  AI message
            const aiMessage = document.createElement("div");
            aiMessage.className = "message ai";
            aiMessage.textContent = replyText;
            chatBox.appendChild(aiMessage);
            // typeText(aiMessage, reply);
            // aiMessage.scrollIntoView({behavior: "smooth"});

            chatBox.scrollTop = chatBox.scrollHeight;

            buttons.forEach(btn => {
                btn.classList.remove("disabled");
                btn.disabled = false;
            });

        } else {
            loading.textContent = "⚠ No reply received.";
        }
    } catch (err) {
        console.error("Error:", err);
    }
});