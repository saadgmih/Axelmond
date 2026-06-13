from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)


OUTPUT = Path(r"C:\Users\saadg\Downloads\DOC-20260611-WA0248_enonces.pdf")
FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


if FONT_REGULAR.exists():
    pdfmetrics.registerFont(TTFont("DocFont", str(FONT_REGULAR)))
    BASE_FONT = "DocFont"
else:
    BASE_FONT = "Helvetica"

if FONT_BOLD.exists():
    pdfmetrics.registerFont(TTFont("DocFont-Bold", str(FONT_BOLD)))
    BOLD_FONT = "DocFont-Bold"
else:
    BOLD_FONT = "Helvetica-Bold"


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontName=BOLD_FONT,
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "Chapter",
        parent=styles["Heading1"],
        fontName=BOLD_FONT,
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0F766E"),
        spaceBefore=14,
        spaceAfter=8,
        borderColor=colors.HexColor("#99F6E4"),
        borderWidth=0,
        borderPadding=0,
    )
)
styles.add(
    ParagraphStyle(
        "Exercise",
        parent=styles["Heading2"],
        fontName=BOLD_FONT,
        fontSize=11.5,
        leading=14,
        textColor=colors.HexColor("#111827"),
        spaceBefore=8,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName=BASE_FONT,
        fontSize=9.5,
        leading=12.8,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#111827"),
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "MatrixBlock",
        parent=styles["Code"],
        fontName=BASE_FONT,
        fontSize=9,
        leading=11.5,
        leftIndent=8,
        textColor=colors.HexColor("#111827"),
        backColor=colors.HexColor("#F8FAFC"),
        borderColor=colors.HexColor("#E5E7EB"),
        borderWidth=0.35,
        borderPadding=5,
        spaceBefore=4,
        spaceAfter=6,
    )
)


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def p(text: str):
    return Paragraph(esc(text), styles["Body"])


def code(text: str):
    return Preformatted(text, styles["MatrixBlock"])


def exercise(num: int, *parts):
    flow = [Paragraph(f"Exercice {num}", styles["Exercise"])]
    for part in parts:
        if isinstance(part, tuple) and part[0] == "code":
            flow.append(code(part[1]))
        else:
            flow.append(p(part))
    flow.append(Spacer(1, 5))
    return KeepTogether(flow)


story = [
    Paragraph("Énoncés des exercices", styles["DocTitle"]),
    Paragraph("Version sans solutions", styles["Body"]),
    Spacer(1, 6),
    Paragraph("Chapitre 1 - Les espaces vectoriels", styles["Chapter"]),
    exercise(
        1,
        "L'ensemble F est-il un sous-espace vectoriel de E sur le corps K dans les cas suivants ?",
        "1) E = R^4, K = R et F = {(x, y, z, t) ∈ R^4, z > 0}\n"
        "2) E = C^4, K = C et F = {(x, y, z, t) ∈ C^4, x + 2iy − 3z + it = 0}\n"
        "3) E = R[X], K = R et F = {P ∈ R[X], P′(0) = 0}\n"
        "4) E = C[X], K = C et F = {P ∈ C[X], (X − i) divise P}\n"
        "5) E = F(R, R), K = R et F = {f ∈ F(R, R), f est dérivable et f′(x) + f(x) ≥ 0, ∀x ∈ R}\n"
        "6) E = F(R, R), K = R et F = {f ∈ F(R, R), f est dérivable}",
    ),
    exercise(
        2,
        "Soient P0 = 1/2(X − 1)(X − 2), P1 = −X(X − 2) et P2 = 1/2 X(X − 1) trois polynômes de R2[X].",
        "1) Montrer que (P0, P1, P2) est une base de R2[X].\n"
        "2) Soit P = aX^2 + bX + c ∈ R2[X], exprimer P dans la base (P0, P1, P2).",
    ),
    exercise(
        3,
        "Soit E = F(R, R), f, g et h les fonctions définies pour tout x ∈ R par : "
        "f(x) = sin(x), g(x) = sin(2x), h(x) = sin(3x). La famille (f, g, h) est-elle libre ?",
    ),
    exercise(
        4,
        "Soit E un K-espace vectoriel de dimension 4 et B = (e1, e2, e3, e4) une base de E. "
        "Soient u1 = e1 + e2 − e3 + e4 et u2 = e1 + 2e2 + e3 + e4. "
        "On note F = Vect(u1, u2) et G = Vect(e1, e2).",
        "1) Montrer que la famille (u1, u2) est libre. Pourquoi est-elle une base de F ?\n"
        "2) Donner une base de G.\n"
        "3) Montrer que F ∩ G = {0}.\n"
        "4) En déduire que E = F ⊕ G.",
    ),
    exercise(
        5,
        "Soit E = R[X] l'espace des polynômes à coefficients réels. On considère F = Vect(P1, P2, P3) "
        "où P1 = X + 1, P2 = X − 1, P3 = X^2 + X sont des éléments de E.",
        "1. Parmi ces propositions, lesquelles sont justes ?\n"
        "[ ] a) P = 1 ∈ F\n"
        "[ ] b) La famille (P1, P2, P3) est liée.\n"
        "[ ] c) La famille (P1, P2) est libre.\n"
        "[ ] d) dim F = 3",
        "2. Soit G = Vect(X^3, X^4). Parmi ces propositions, lesquelles sont justes ?\n"
        "[ ] a) P = 1 ∈ G\n"
        "[ ] b) La famille (X^3, X^4) est libre.\n"
        "[ ] c) dim G = 1\n"
        "[ ] d) dim G = 2",
        "3. Cocher les propositions vraies :\n"
        "[ ] a) G ∩ F = {0E}\n"
        "[ ] b) G ∩ F = {0E, X, X^2}\n"
        "[ ] c) La somme F + G est directe.\n"
        "[ ] d) G ⊕ F = R[X].",
    ),
    exercise(
        6,
        "Soit E = R[X] l'espace des polynômes à coefficients réels. On considère "
        "F = {P ∈ E, P − P′ = 1} et G = {P ∈ E, P(0) = P′(0) = 0}.",
        "1. Parmi ces propositions, lesquelles sont justes ?\n"
        "[ ] a) P = 1 ∈ F\n"
        "[ ] b) F est un sous-espace vectoriel de E.\n"
        "[ ] c) G est un sous-espace vectoriel de E.\n"
        "[ ] d) F ∩ G = {0E}",
        "2. Parmi ces propositions, lesquelles sont justes ?\n"
        "[ ] a) La famille (X^2, X^4) est libre.\n"
        "[ ] b) La famille (X^2, X^4) est génératrice de F.\n"
        "[ ] c) La famille (X^2, X^4) n'est pas génératrice de G.\n"
        "[ ] d) La famille (X^2, X^4) est une base de G.",
        "3. On pose H = Vect(X^2, X^4). Cocher les propositions vraies :\n"
        "[ ] a) H est un sous-espace vectoriel de E.\n"
        "[ ] b) H ∩ F = {0E}\n"
        "[ ] c) dim(H) = 1.\n"
        "[ ] d) dim(H) = 2.",
    ),
    PageBreak(),
    Paragraph("Chapitre 2 - Les applications linéaires", styles["Chapter"]),
    exercise(
        7,
        "Les applications suivantes sont-elles des applications linéaires ?",
        "1) f : R^2 → R^2, (x, y) → (x − y, x + 2y)\n"
        "2) g : R^3 → R^3, (x, y, z) → (x + y, x − 2y, 1)\n"
        "3) h : R[X] → R, P → P′(1)\n"
        "4) l : R^2 → R, (x, y) → x^2 + y^2\n"
        "5) t : C[X] → C[X], P → XP − P′",
    ),
    exercise(
        8,
        "On considère l'application f : R^2 → R^3, (x, y) → (x − y, x − y, x + y).",
        "1) Montrer que f est linéaire.\n"
        "2) Déterminer Ker(f) ; que peut-on conclure ?\n"
        "3) Déterminer Im(f).\n"
        "4) f est-elle surjective ?",
    ),
    exercise(
        9,
        "Soient E et F deux K-espaces vectoriels de dimension finie, f une application linéaire de E dans F "
        "et S = (e1, e2, ..., en) une famille de vecteurs de E.",
        "1) Montrer que si S est une famille génératrice de E, alors f(S) = (f(e1), f(e2), ..., f(en)) "
        "est une famille génératrice de Im(f).\n"
        "2) Montrer que si S est une famille libre de E et f est injective, alors f(S) est une famille libre.\n"
        "3) Déduire que si S est une base de E et f est injective, alors f(S) est une base de Im(f).",
    ),
    exercise(
        10,
        "Soit f une application linéaire de R^2 dans R^3 telle que f(1, 2) = (−1, 1, 1) "
        "et f(−3, 2) = (2, −1, 3).",
        "1) Donner f(x, y) en fonction de x et y.\n"
        "2) Déterminer Ker(f), que peut-on conclure ?\n"
        "3) En déduire une base de Im(f).",
    ),
    exercise(
        11,
        "On considère l'application f : R^3 → R^2, (x, y, z) → (x + y, 2y − z).",
        "1) Montrer que f est linéaire.\n"
        "2) Déterminer une base de Ker(f).\n"
        "3) f est-elle injective ?\n"
        "4) Déterminer une base de Im(f).\n"
        "5) f est-elle surjective ?\n"
        "6) f est-elle bijective ?",
    ),
    exercise(
        12,
        "On considère l'application g : R3[X] → R3[X], P → P − XP′.",
        "1) Montrer que g est linéaire.\n"
        "2) Déterminer une base de Ker(g).\n"
        "3) g est-elle injective ?\n"
        "4) Calculer rg(g).\n"
        "5) Déterminer une base de Im(g).",
    ),
    exercise(
        13,
        "Soit h : R2[X] → R^2 une application linéaire telle que h(1) = (1, −1), h(X) = (1, 1), "
        "h(X^2) = (0, 0), avec {1, X, X^2} la base canonique de R2[X].",
        "1) Soit P = a0 + a1X + a2X^2 ∈ R2[X], donner h(P) en fonction de a0, a1, a2.\n"
        "2) Déterminer Ker(h) et une base de Ker(h).\n"
        "3) Déterminer Im(h) et une base de Im(h).\n"
        "4) h est-elle injective, surjective, bijective ?\n"
        "5) Trouver un polynôme P ∈ R2[X] tel que h(P) = (−3, 1).",
    ),
    PageBreak(),
    Paragraph("Chapitre 3 - Matrices", styles["Chapter"]),
    exercise(
        14,
        "Soient A, B, C et D les matrices suivantes. Calculer si possible AB, BC, AD, A^2, 5C − D.",
        ("code", "A = [ 2   1 ]      B = [ -1   3   4 ]\n"
                 "    [ -1  3 ]          [  2   2   0 ]\n\n"
                 "C = [ 2   3  -1 ]  D = [ -1   3   1 ]\n"
                 "    [ 1   4   3 ]      [  2   1  -2 ]\n"
                 "    [ 2   0   3 ]      [  4   5   0 ]"),
    ),
    exercise(
        15,
        "Soit A la matrice de M3(R) définie ci-dessous. On pose B = A − I3.",
        ("code", "A = [ 1   1   0 ]\n"
                 "    [ 0   1   1 ]\n"
                 "    [ 0   0   1 ]"),
        "1) Calculer B^2 et B^3.\n"
        "2) En déduire que A est inversible.\n"
        "3) En déduire A^−1.\n"
        "4) Retrouver A^−1 par une autre méthode.",
    ),
    exercise(
        16,
        "On considère l'application f : R^3 → R^3. Soient B = (e1, e2, e3) la base canonique de R^3 et "
        "A = M(f ; B) la matrice de f relative à la base canonique.",
        ("code", "A = [ 5   3  -3 ]\n"
                 "    [ 1   3  -1 ]\n"
                 "    [ 0   0   2 ]"),
        "On considère les vecteurs e′1 = (1, 0, 1), e′2 = (−1, 1, 0) et e′3 = (3, 1, 0).",
        "1) Montrer que B′ = (e′1, e′2, e′3) est une base de R^3.\n"
        "2) Déterminer M(f, B′).\n"
        "3) Déterminer rg(f).\n"
        "4) Calculer la matrice de passage de B à B′.\n"
        "5) Calculer la matrice de passage de B′ à B.",
    ),
    exercise(
        17,
        "On considère l'application f : R^3 → R^3, (x, y, z) → (2x, x + y, y + z). "
        "Soient B = (e1, e2, e3) la base canonique de R^3 et la famille B′ = (f1, f2, f3) telle que "
        "f1 = e1 + e2 + e3, f2 = −e1 + 2e2 et f3 = 2e1.",
        "1) Montrer que B′ = (f1, f2, f3) est une base de R^3.\n"
        "2) Déterminer M(f, B).\n"
        "3) Calculer P la matrice de passage de B à B′.\n"
        "4) Calculer P^−1.\n"
        "5) En déduire M(f, B′).",
    ),
    exercise(
        18,
        "Soit P la matrice ci-dessous. Soit f un endomorphisme de R^3 dont la matrice relative à la base canonique de R^3 est P.",
        ("code", "P = [ 2  -1   2 ]\n"
                 "    [ 1   0   1 ]\n"
                 "    [ 3   1   1 ]"),
        "1) Calculer le rang de P.\n"
        "2) En déduire que P est inversible.\n"
        "3) f est-il bijectif ?\n"
        "4) Calculer P^−1.",
    ),
    exercise(
        19,
        "On considère l'application linéaire g : R3[X] → R3[X], P → P − XP′, et soit "
        "B = (1, X, X^2, X^3) la base canonique de R3[X].",
        "1) Donner la matrice A = M(g, B).\n"
        "2) En déduire rg(g).\n"
        "3) f est-elle surjective ?\n"
        "4) Calculer A^2, A^3 et A^n pour n ∈ N*.",
    ),
    exercise(
        20,
        "Déterminer suivant les valeurs de m le rang de la matrice suivante et calculer son inverse lorsqu'il existe.",
        ("code", "P = [  1   1   1 ]\n"
                 "    [ -1   1   m ]\n"
                 "    [  1  -1   2 ]"),
    ),
    PageBreak(),
    Paragraph("Chapitre 4 - Déterminants", styles["Chapter"]),
    exercise(
        21,
        "Calculer les déterminants des matrices suivantes :",
        ("code", "A = [ 1   2   3 ]   B = [ 1   0  -1 ]   C = [ 4   1  -1 ]\n"
                 "    [ 0   4   5 ]       [ 2   1   4 ]       [ 0   0   2 ]\n"
                 "    [ 0   0   6 ]       [ 3   0   1 ]       [ 3   2   1 ]\n\n"
                 "D = [ 0   1   1   0 ]\n"
                 "    [ 1   0   0   1 ]\n"
                 "    [ 1   1   0   1 ]\n"
                 "    [ 1   1   1   0 ]\n\n"
                 "M = [ a   b   c   d ]\n"
                 "    [ a   a   b   c ]\n"
                 "    [ a   a   a   b ]\n"
                 "    [ a   a   a   a ]"),
    ),
    exercise(
        22,
        "On considère les matrices suivantes :",
        ("code", "T = [ 1    0   0 ]    A = [  1  -10   11 ]\n"
                 "    [ 3    1   0 ]        [ -3    6    5 ]\n"
                 "    [ 0   -2   1 ]        [ -6   12    8 ]"),
        "1) Déterminer la matrice B = TA et calculer le déterminant de B.\n"
        "2) Déduire de la question précédente le déterminant de A.\n"
        "3) Déduire de la question précédente le déterminant de C :",
        ("code", "C = [   3    5   55 ]\n"
                 "    [  -9   -3   25 ]\n"
                 "    [ -18   -6   40 ]"),
    ),
    exercise(
        23,
        "Soit u l'endomorphisme de R3[X] défini par u(P) = P + P′, ∀P ∈ R3[X].",
        "1) Calculer det(u).\n"
        "2) En déduire que u est un automorphisme de R3[X].\n"
        "3) Donner la matrice de u^−1 dans la base canonique de R3[X].",
    ),
    exercise(
        24,
        "Pour a ∈ R, on considère la matrice Ma ci-dessous. Déterminer les valeurs de a pour lesquelles "
        "l'application linéaire associée à Ma est bijective.",
        ("code", "Ma = [  1   3   a ]\n"
                 "     [  2  -1   1 ]\n"
                 "     [ -1   1   0 ]"),
    ),
    exercise(
        25,
        "Soit dans R^3 la famille de vecteurs (e1, e2, e3), avec e1 = (1, 1, t), "
        "e2 = (1, t, 1), e3 = (t, 1, 1). Pour quelles valeurs de t la famille (e1, e2, e3) est libre ?",
    ),
    exercise(
        26,
        "Dans R^4, on considère les vecteurs suivants : "
        "V1 = (1, 3, 0, 0), V2 = (0, 1, −2, 0), V3 = (0, 0, 1, 0), V4 = (1, 2, 3, 0).",
        "Calculer le rang des vecteurs V1, V2, V3 et V4.",
    ),
]


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont(BASE_FONT, 8)
    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.drawRightString(A4[0] - 1.4 * cm, 0.9 * cm, f"Page {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    rightMargin=1.45 * cm,
    leftMargin=1.45 * cm,
    topMargin=1.35 * cm,
    bottomMargin=1.4 * cm,
)
doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(OUTPUT)
