# GyuriCAD — kísérlet 01

Egy négyfalú, téglalap alakú ház kutatási prototípusa. A cél nem egy miniatűr CAD elkészítése, hanem annak vizsgálata, hogy egyetlen, kezdetben hiányos szándékmodellből ugyanaz a feloldó motor képes-e konzisztens 2D és 3D reprezentációt előállítani.

## Mit bizonyít a prototípus?

- A belső méretek és az ablak paraméterei csak egyszer, a `model.js`-ben léteznek.
- A `resolver.js` ugyanabból a szándékból állít elő tér-, szerkezeti és rétegrendi feloldást.
- A negyedik, csomóponti feloldás explicit ablakbeépítési szabályt ad: tokhelyzetet, hőszigetelés-ráfordulást, belső/középső/külső zárási síkot, párkányt és könyöklőt.
- A Canvas alaprajz és a Three.js modell egymástól függetlenül kér részletezettséget ugyanattól a feloldótól.
- Az ablak 2D-ben megszakítja a fal szegmenseit, 3D-ben pedig a faltestek az ablak körül generálódnak; nem egy sötét folt takarja el a falat.
- A javasolt szerkezet tervezői döntésként rögzíthető, miközben a geometria változatlan forrásból épül újra.

## Tudatos korlátok

- A topológia egyelőre rögzített téglalap, nem általános falgráf.
- A feloldó determinisztikus szabály, nem AI; a csomóponti adatok szemléltető kiindulóértékek, nem gyártói rendszer vagy méretezés eredményei.
- Egy falon egyetlen ablak van.
- A 3D csomópontok dobozokból épülnek; valódi rétegprioritás és poligon-boole még nincs.
- A Three.js jelenleg CDN-ről töltődik.

Az eredeti, egyfájlos demonstráció a `legacy-prototype.html` fájlban maradt meg.

## Kísérlet 02: profil + útvonal

A `sweep.html` egy általánosabb geometriai receptet vizsgál. A felhasználó egy 2D keresztmetszeti profilt és egy alaprajzi útvonalat szerkeszt; a Three.js mesh ezekből minden változáskor újraépül. A recept először szemantikailag ismeretlen, majd ugyanennek a geometriának ereszcsatorna-jelentés adható anélkül, hogy a forrásgeometria megváltozna.

A 3D nézet négy szemantikus zoomállapotot használ: Szándék (csak az útvonal), Forma (söpört felület), Szerkezet (profilélek és illesztések), valamint Beépítés. Az utolsó állapotban a tartóvasak nem tárolt objektumok: az `installation.supportSpacing` szabály alapján generálódnak az útvonalon.

## Kísérlet 03: papírtér és rajzgyártás

A `drawing.html` ugyanabból a `model.js` szándékmodellből készít A3-as, léptékhelyes vektoros alaprajzot. A papírtér M 1:50 és M 1:100 lépték, szerkezeti vagy teljes rétegrendi feloldás, valamint méretezés között váltható. A rajz SVG-ként közvetlenül exportálható, vagy a böngésző nyomtatási párbeszédablakából vektoros PDF-ként menthető — Revit és Archicad közbeiktatása nélkül.

Az `index.html`, a `sweep.html` és a `drawing.html` fejlécében közös kísérletválasztó navigáció található, így az indexből minden prototípus elérhető.

## Kísérlet 04: szerkeszthető falgráf

A `graph.html` oldalon egy zárt, több sarokpontból álló alaprajz szerkeszthető. A sarokpontok húzása azonnal újraépíti a 2D nézetet, az egyszerű 3D tömeget és az A3-as vektoros tervlapot. Falszakasz kijelölése után az ablak áthelyezhető arra a falra. A böngésző helyben megőrzi az állapotot; az **Alapállapot visszaállítása** gomb törli a módosított geometriát.

## Falgráf az 01-es szerkesztőben

Az `index.html` most a szerkeszthető falgráfot használja közös modellként. Sarokpontokat lehet húzni, falszakaszt kijelölni, és az ablakot egy másik falra áthelyezni. A 2D és 3D részletezettség zoomra változik; a `drawing.html` ugyanebből a böngészőben tárolt gráfból készít réteges A3-as SVG rajzot. A 04-es oldal önálló korábbi kísérlet maradt.

## Szabad falrajzolás

Az 01-es szerkesztőben válaszd a **Fal rajzolása** módot, majd kattints a kezdő- és végpontra. Meglévő falra kattintva a fal kettéválik. Az új belső fal nem kap homlokzati hőszigetelést; a felismert helyiségek területe a nézeteken és az SVG rajzon is megjelenik. `Esc` megszakítja a folyamatban lévő rajzolást. Kijelölt belső fal törölhető.
