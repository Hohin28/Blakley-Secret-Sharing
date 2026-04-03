let secret = [];
let shares = [];
let n_variables = 0;
let selectedShares = new Set();

const parseInput = (input) => input.trim().split(/\s+/).map(s => parseFloat(s)).filter(n => !isNaN(n));

const formatShare = (index, coeffs, constant) => {
    let eq = `Share ${index}: `;
    for (let i = 0; i < coeffs.length; i++) {
        const coeff = coeffs[i];
        if (i > 0 && coeff >= 0) eq += " + ";
        eq += `${coeff.toFixed(4)}*x${i + 1}`;
    }
    return `${eq} = ${constant.toFixed(4)}`;
};

// Enhanced resetState with optional confirmation
const resetState = (confirmReset = true) => {
    if (confirmReset && !confirm("Are you sure you want to reset all data?")) return;
    document.getElementById('secret-point').value = '';
    document.getElementById('shares-output').textContent = 'Shares will appear here after generation.';
    document.getElementById('result-output').textContent = '';
    document.getElementById('selection-info').textContent = '';
    shares = [];
    secret = [];
    n_variables = 0;
    selectedShares.clear();
};

function generateShares() {
    resetDisplay();

    const n = parseInt(document.getElementById('n-variables').value);
    const numShares = parseInt(document.getElementById('num-shares').value);
    const secretPoint = parseInput(document.getElementById('secret-point').value);

    if (secretPoint.length !== n || numShares < n || n < 1) {
        alert(`Validation Error: Secret must have ${n} values, and Num Shares must be >= ${n}.`);
        return;
    }

    secret = secretPoint;
    n_variables = n;
    selectedShares.clear();

    const container = document.getElementById('shares-output');
    container.innerHTML = '';
    document.getElementById('selection-info').textContent = `Select exactly ${n} shares.`;

    for (let i = 0; i < numShares; i++) {
        const coefficients = Array.from({ length: n }, () => Math.floor(Math.random() * 100) + 1);
        let constant = coefficients.reduce((sum, coeff, j) => sum + coeff * secret[j], 0);
        shares.push({ coefficients, constant }); 

        const shareDiv = document.createElement('div');
        shareDiv.classList.add('share-line');
        shareDiv.textContent = formatShare(i + 1, coefficients, constant);
        shareDiv.dataset.index = i + 1;

        // Click to select/unselect with limit
        shareDiv.addEventListener('click', () => toggleShareSelection(i + 1, shareDiv));
        container.appendChild(shareDiv);
    }
}

function toggleShareSelection(index, element) {
    const n = n_variables;
    if (selectedShares.has(index)) {
        selectedShares.delete(index);
        element.classList.remove('selected');
    } else {
        if (selectedShares.size >= n) {
            alert(`You can only select ${n} shares for reconstruction.`);
            return;
        }
        selectedShares.add(index);
        element.classList.add('selected');
    }
    document.getElementById('selection-info').textContent = `Selected ${selectedShares.size} of ${n} shares.`;
}

function reconstructSecret() {
    document.getElementById('result-output').textContent = 'Attempting reconstruction...';

    const n = n_variables;
    const selectedIndices = Array.from(selectedShares);

    if (selectedIndices.length !== n || n === 0) {
        document.getElementById('result-output').textContent = `ERROR: Select exactly ${n} shares by clicking them.`;
        return;
    }

    try {
        let A = [];
        let B = [];

        for (let index of selectedIndices) {
            const s = shares[index - 1];
            A.push([...s.coefficients]); 
            B.push(s.constant);
        }

        // Gaussian Elimination
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
            }
            [A[i], A[maxRow]] = [A[maxRow], A[i]];
            [B[i], B[maxRow]] = [B[maxRow], B[i]];

            if (Math.abs(A[i][i]) < 1e-9) {
                throw new Error("System is singular or dependent (determinant is near zero).");
            }

            for (let k = i + 1; k < n; k++) {
                const factor = A[k][i] / A[i][i];
                for (let j = i; j < n; j++) {
                    A[k][j] -= factor * A[i][j];
                }
                B[k] -= factor * B[i];
            }
        }

        let X = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += A[i][j] * X[j];
            }
            X[i] = (B[i] - sum) / A[i][i];
        }

        const recoveredSecret = X;
        const roundedSecret = recoveredSecret.map(val => val.toFixed(4));
        
        let output = `Original Secret: [${secret.map(s => s.toFixed(4)).join(', ')}]\n`;
        output += `Reconstructed Secret: [${roundedSecret.join(', ')}]`;
        
        const maxDiff = recoveredSecret.reduce((max, val, i) => Math.max(max, Math.abs(val - secret[i])), 0);
        
        if (maxDiff < 1e-4) {
             output += '\n\nReconstruction successful and accurate. 🎉';
        } else {
             output += `\n\nWarning: Slight floating-point error (Max diff: ${maxDiff.toFixed(6)}).`;
        }

        document.getElementById('result-output').textContent = output;

    } catch (error) {
        document.getElementById('result-output').textContent = `RECONSTRUCTION FAILED: ${error.message}`;
        console.error(error);
    }
}

const resetDisplay = () => {
    document.getElementById('shares-output').textContent = 'Shares will appear here after generation.';
    document.getElementById('result-output').textContent = '';
    document.getElementById('selection-info').textContent = '';
    shares = [];
    secret = [];
    n_variables = 0;
    selectedShares.clear();
};

document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const activeId = document.activeElement.id;
        if (['n-variables', 'secret-point', 'num-shares'].includes(activeId)) {
            event.preventDefault();
            generateShares();
        }
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        reconstructSecret();
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        resetState(true);
    }
});
