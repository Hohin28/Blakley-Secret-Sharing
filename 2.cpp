#include <iostream>
#include <vector>
#include <cstdlib>
#include <ctime>
#include <cmath>
using namespace std;
class Hyperplane {
protected:
    vector<double> coefficients;
    double constant;

public:
    Hyperplane(int n) {
        coefficients = vector<double>(n, 0);
        constant = 0;
    }
    void setCoefficients(const vector<double>& coeffs) {
        coefficients = coeffs;
    }
    void setConstant(double c) {
        constant = c;
    }
    const vector<double>& getCoefficients() const {
        return coefficients;
    }
    double getConstant() const {
        return constant;
    }
    void print(int index) const {
        cout << "Share " << index << ": ";
        for (int i = 0; i < coefficients.size(); i++) {
            if (i > 0) cout << " + ";
            cout << coefficients[i] << "*x" << (i + 1);
        }
        cout << " = " << constant << endl;
    }
};
class ISecretReconstructor {
public:
    virtual vector<double> reconstruct(
        const vector<Hyperplane>& shares,
        const vector<int>& selectedIndices,
        int n) = 0;

    virtual ~ISecretReconstructor() {}
};
class GaussianReconstructor : public ISecretReconstructor {
public:
    vector<double> reconstruct(const vector<Hyperplane>& shares,
                               const vector<int>& selectedIndices,
                               int n) override {
        vector<vector<double>> A(n, vector<double>(n));
        vector<double> B(n);

        for (int i = 0; i < n; i++) {
            int idx = selectedIndices[i] - 1;
            A[i] = shares[idx].getCoefficients();
            B[i] = shares[idx].getConstant();
        }

        // Gaussian Elimination
        for (int i = 0; i < n; i++) {
            int maxRow = i;
            for (int k = i + 1; k < n; k++) {
                if (fabs(A[k][i]) > fabs(A[maxRow][i]))
                    maxRow = k;
            }
            swap(A[i], A[maxRow]);
            swap(B[i], B[maxRow]);

            if (fabs(A[i][i]) < 1e-9) {
                cout << "Cannot solve. System is singular or dependent.\n";
                return vector<double>(n, 0);
            }

            for (int k = i + 1; k < n; k++) {
                double factor = A[k][i] / A[i][i];
                for (int j = i; j < n; j++) {
                    A[k][j] -= factor * A[i][j];
                }
                B[k] -= factor * B[i];
            }
        }

        vector<double> X(n);
        for (int i = n - 1; i >= 0; i--) {
            X[i] = B[i];
            for (int j = i + 1; j < n; j++) {
                X[i] -= A[i][j] * X[j];
            }
            X[i] /= A[i][i];
        }

        return X;
    }
};
class SecretSharingSystem {
private:
    vector<double> secret;
    vector<Hyperplane> shares;
    ISecretReconstructor* reconstructor;

public:
    SecretSharingSystem(ISecretReconstructor* r) : reconstructor(r) {}

    void setSecret(const vector<double>& sec) {
        secret = sec;
    }

    void generateShares(int numShares) {
        int n = secret.size();
        shares.clear();

        for (int i = 0; i < numShares; i++) {
            Hyperplane h(n);
            vector<double> coeffs(n);
            for (int j = 0; j < n; j++) {
                coeffs[j] = rand() % 10 + 1;
            }

            double constant = 0;
            for (int j = 0; j < n; j++) {
                constant += coeffs[j] * secret[j];
            }

            h.setCoefficients(coeffs);
            h.setConstant(constant);
            shares.push_back(h);
        }
    }

    void displayShares() const {
        for (int i = 0; i < shares.size(); i++) {
            shares[i].print(i + 1);
        }
    }

    vector<double> reconstructSecret(const vector<int>& selectedShares) {
        return reconstructor->reconstruct(shares, selectedShares, secret.size());
    }
};
int main() {
    srand(time(0));

    int n;
    cout << "Enter number of variables in secret (n): ";
    cin >> n;

    vector<double> secret(n);
    cout << "Enter the secret point (space-separated, " << n << " values): ";
    for (int i = 0; i < n; i++) {
        cin >> secret[i];
    }

    ISecretReconstructor* reconstructor = new GaussianReconstructor();
    SecretSharingSystem system(reconstructor);
    system.setSecret(secret);

    int numShares;
    cout << "Enter number of shares (should be >= " << n << "): ";
    cin >> numShares;

    if (numShares < n) {
        cout << "You must generate at least " << n << " shares." << endl;
        delete reconstructor;
        return 1;
    }

    system.generateShares(numShares);
    cout << "\nGenerated Shares:\n";
    system.displayShares();

    vector<int> selectedShares(n);
    cout << "\nEnter " << n << " share numbers to reconstruct the secret: ";
    for (int i = 0; i < n; i++) {
        cin >> selectedShares[i];
    }

    vector<double> recovered = system.reconstructSecret(selectedShares);
    cout << "\nReconstructed secret point: ";
    for (double val : recovered) {
        cout << val << " ";
    }
    cout << endl;

    delete reconstructor;
    return 0;
}
