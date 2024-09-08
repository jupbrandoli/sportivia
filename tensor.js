// More API functions here:
    // https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

    // the link to your model provided by Teachable Machine export panel
    const URL = "https://teachablemachine.withgoogle.com/models/LckLdM_as/";
    let model, webcam, ctx, labelContainer, maxPredictions;
    let capturing = false;
    
    window.onload = async function () {
        await setupWebcam();
    };
    
    async function setupWebcam() {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
    
        // Carregar o modelo e os metadados
        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
    
        // Configuração da webcam
        const size = 200;
        const flip = true; // se a webcam deve ser invertida
        webcam = new tmPose.Webcam(size, size, flip); // largura, altura, flip
        await webcam.setup(); // solicita acesso à webcam
        await webcam.play();
        window.requestAnimationFrame(loop);
    
        // Adicionar elementos ao DOM
        const canvas = document.getElementById("canvas");
        canvas.width = size; 
        canvas.height = size;
        ctx = canvas.getContext("2d");
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) { 
            labelContainer.appendChild(document.createElement("div"));
        }
    }
    
    async function loop(timestamp) {
        webcam.update(); // atualiza o frame da webcam
        if (!capturing) {
            await predict(); // só faz a previsão se não estiver capturando
        }
        window.requestAnimationFrame(loop);
    }
    
    async function predict() {
        const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
        const prediction = await model.predict(posenetOutput);
    
        for (let i = 0; i < maxPredictions; i++) {
            const classPrediction =
                prediction[i].className + ": " + (prediction[i].probability * 100).toFixed(0);
            labelContainer.childNodes[i].innerHTML = classPrediction;
        }
    
        drawPose(pose);
    }
    
    function drawPose(pose) {
        if (webcam.canvas) {
            ctx.drawImage(webcam.canvas, 0, 0);
            if (pose) {
                const minPartConfidence = 0.5;
                tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
                tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
            }
        }
    }
    
    // Captura a pose por 3 segundos e calcula a média de cada classe
    async function captureGesture() {
        capturing = true;
        const results = Array(maxPredictions).fill(0);
        const samples = 30; // 3 segundos com 30 amostras (100 ms por amostra)
    
        for (let i = 0; i < samples; i++) {
            const { posenetOutput } = await model.estimatePose(webcam.canvas);
            const prediction = await model.predict(posenetOutput);
    
            // Acumula as probabilidades de cada classe
            for (let j = 0; j < maxPredictions; j++) {
                results[j] += prediction[j].probability;
            }
    
            await new Promise(resolve => setTimeout(resolve, 100)); // espera 100ms
        }
    
        // Calcula a média das probabilidades para cada classe
        const averages = results.map(result => result / samples);
    
        // Encontra a classe com a maior média de probabilidade
        const maxIndex = averages.indexOf(Math.max(...averages));
        const resultClass = model.getClassLabels()[maxIndex];
    
        // Exibe os detalhes com base no resultado
        showResultDetails(resultClass, (averages[maxIndex] * 100).toFixed(0));
    
        capturing = false;
    }
    
    // Função para mostrar os detalhes da classe detectada
    function showResultDetails(resultClass, confidence) {
        const classDetails = {
            "Saque": {
                name: "Saque",
                image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAPDRAQDw8REA4RFRATEBUSFhYXFRATFREaFhkSFhUYHSggGh0lGxUaLT0hKSkrLi4wFyAzODMtOSgtOisBCgoKDg0OGxAQGi0mICU3LTErNTcuLS0tLS8rLSstLzUvLS0tLS0tNy0tKy4tNzUtLS0tLS0tLS0rLS0tLS0rLf/AABEIAKgBLAMBIgACEQEDEQH/xAAcAAEAAgIDAQAAAAAAAAAAAAAAAQcFBgIDBAj/xABDEAABAwIDBQUFBQUGBwEAAAABAAIDBBEFEiEGEzFBUQciYXGRFDJSgaFCYnKCsSMkQ6LRM1OSwcLhNURjg5OywxX/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAwIBBP/EACURAQADAAIBBAEFAQAAAAAAAAABAhEDEjEhIkGBEzIzQlHhBP/aAAwDAQACEQMRAD8Ao1ERAREQE", // Substitua com o URL da imagem de saque
                description: "O saque é considerado o primeiro ataque, pois é o fundamento que dá início ao jogo ou ao rally. Para executar um saque, o sacador segura a bola com uma mão e com a outra lança por cima da rede em direção à quadra adversária."
            },
            "Levantamento": {
                name: "Levantamento",
                image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhAPEhAVEBUPFg8QDxUVFQ8QFQ8PFRUWFhUVFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGi0fHR0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIALcBEwMBEQACEQEDEQH/xAAbAAACAgMBAAAAAAAAAAAAAAACAwEEAAUGB//EAEYQAAIBAgQDBQMIBgkDBQAAAAECAAMRBAUSITFBUQYTIlJhcZGhBxQVMoGxwdEWI0Ji4fAkJVRjcnOCkvEzQ6I0U5Oywv/EABsBAAMAAwEBAAAAAAAAAAAAAAABAgMEBQYH/8QAMxEAAgIBAgUCAwcFAQEBAAAAAAECEQMEEgUTITFRQWEUIjIGFXGBobHRIzNCkcHw8UP/2", // Substitua com o URL da imagem de levantamento
                description: "O levantamento é um fundamento essencial no voleibol, onde os jogadores realizam a ação de elevar a bola após a recepção, com o objetivo de facilitar um ataque. Para um bom levantamento, é importante flexionar levemente os joelhos, manter as costas retas e os cotovelos em um ângulo adequado, garantindo que a bola ganhe altura suficiente para um ataque eficiente."
            },
            "Não é fundamento": {
                name: "Não é fundamento",
                image: "https://blog.futfanatics.com.br/wp-content/uploads/2018/08/banner-volei-bola.jpg", // Substitua com o URL da imagem correspondente
                description: "A pose detectada não corresponde a um fundamento de voleibol."
            }
        };
    
        // Verifica se a classe detectada está entre as classes conhecidas
        if (classDetails[resultClass]) {
            const details = classDetails[resultClass];
    
            // Atualiza o DOM para mostrar a imagem e a descrição
            const resultContainer = document.getElementById("result-container");
            resultContainer.innerHTML = `
                <h2>${details.name}</h2>
                <img src="${details.image}" alt="${details.name}" style="max-width: 200px;"/>
                <p>${details.description}</p>
                <p>Confiança: ${confidence}%</p>
            `;
        }
    }
    