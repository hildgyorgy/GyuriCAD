# GyuriCAD — handoff

Utolsó frissítés: 2026-10-07

## A projekt egy mondatban

A GyuriCAD nem kész 2D/3D elemeket akar eltárolni, hanem egy lehetőleg kicsi, szemantikus **igazságmodellt**, amelyből a program az aktuális figyelem, lépték és tervezői döntések alapján építi fel a szükséges geometriát, részleteket és rajzi reprezentációt.

## A fontos gondolat

- Az igazság nem az alaprajz, nem a 3D mesh és nem a PDF.
- A 2D, a 3D és a papírrajz ugyanannak a modellnek különböző lekérdezései.
- A szemantikus zoom nem egyszerű nagyítás: közeledéskor új tudás és új szabályok lépnek működésbe.
- A rendszernek nem kell előre minden falréteget és csomópontot eltárolnia. Ezeket a szándékból, a környezetből és az aktuális „skillből” oldhatja fel.
- A későbbi beágyazott AI szerepe nem a stílusutánzó képgenerálás, hanem a hiányos modell értelmes, ellenőrizhető kibontása.
- A tervező sokáig felülnézetben dolgozhat; a 3D csak akkor jelenjen meg, amikor valóban segít.
- A geometriai recept jelentés nélkül is létezhet, majd később építészeti szerepet kaphat anélkül, hogy a forrásgeometria megváltozna.

Jó mentális modell: fókuszváltáskor a program ideiglenesen betölt egy szűk szakmai tudáskészletet — például „fürdőszoba skill”, „csomópont skill” vagy „ereszbeépítés skill” —, a pillanatnyilag érdektelen tudást pedig háttérbe teszi.

## Indítás egy új gépen

Nincs buildlépés és nincs csomagkezelő. A projekt sima HTML/CSS/JavaScript.

Ajánlott indítás a projekt gyökeréből:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Ezután:

```text
http://127.0.0.1:8765/index.html
```

Az oldalak `file://` URL-ről is megnyithatók a jelenlegi környezetben, de a modulok miatt a helyi webszerver megbízhatóbb. A Three.js jelenleg CDN-ről érkezik, ezért az 01-es és 02-es kísérlet 3D nézetéhez internetkapcsolat kell.

## Jelenlegi kísérletek

### 01 — Négyfalú ház (`index.html`)

Egy téglalap alakú ház négy fallal és egy déli ablakkal.

- Egyetlen szándékmodell: `model.js`.
- A `resolver.js` négy feloldási szintet ad:
  1. Tér / szándék
  2. Szerkezet
  3. Rétegrend
  4. Csomópont
- A 2D Canvas és a Three.js nézet ugyanazt a modellt oldja fel, de külön reprezentációt készít.
- Az ablak valódi nyílásként szakítja meg a falat 2D-ben és 3D-ben.
- A javasolt szerkezet tervezői döntésként rögzíthető.
- A negyedik szint szemléltető ablakcsomópontot generál tömítési síkokkal, ráfordulással, párkánnyal és könyöklővel.

Fő fájlok:

- `model.js` — a közös szándékmodell és annak módosítása
- `resolver.js` — feloldási szintek, falrétegek, ablakcsomópont
- `view2d.js` — Canvas alaprajzi reprezentáció
- `view3d.js` — Three.js reprezentáció
- `app.js` — vezérlés és összekötés

### 02 — Profil + útvonal (`sweep.html`)

Azt vizsgálja, hogyan lesz egy érdekesebb 3D tárgyból először eltárolható igazság, és csak utána megjelenítés.

- Az eltárolt geometriai recept egy szerkeszthető 2D profilból és egy szerkeszthető alaprajzi útvonalból áll.
- A 3D háló ezekből minden változáskor újragenerálódik.
- A geometria kezdetben „ismeretlen söpört elem”.
- Később ereszcsatorna-jelentést kaphat a forrásgeometria megváltoztatása nélkül.
- Négy szemantikus zoomállapot van: Szándék → Forma → Szerkezet → Beépítés.
- A Beépítés szinten a csatornatartó vasak nem tárolt objektumok: a kiosztási szabályból generálódnak.

Fő fájlok:

- `sweep-model.js` — profil, útvonal, jelentés és beépítési szabály
- `sweep-editors.js` — profil- és útvonalszerkesztő Canvasok
- `sweep-view3d.js` — generált Three.js felület és szemantikus zoom
- `sweep-app.js` — vezérlés

### 03 — Papírtér (`drawing.html`)

Azt bizonyítja, hogy a modellből Revit/Archicad közbeiktatása nélkül is készülhet műszaki rajz.

- Ugyanazt a `model.js` modellt használja, mint az 01-es kísérlet.
- A `drawing-scene.js` egy reprezentációfüggetlen vektoros rajzi jelenetet épít.
- A `drawing-app.js` ezt A3 fekvő SVG-vé alakítja.
- Választható M 1:50 vagy M 1:100.
- Választható szerkezeti vagy teljes rétegrendi feloldás.
- A méretezés külön kapcsolható.
- A falméret és az ablakméret módosítására a rajz azonnal újragenerálódik.
- Az SVG közvetlenül letölthető.
- A „Nyomtatás / PDF” gomb a böngésző nyomtatási ablakát nyitja; onnan vektoros A3 PDF menthető.
- A vonalvastagságok és a lap méretei papírmilliméterben vannak meghatározva.

Fő fájlok:

- `drawing-scene.js` — a modellből felépülő rajzi elemek
- `drawing-app.js` — SVG-renderelés, export és kezelőfelület
- `drawing.css` — képernyős papírtér és A3 nyomtatási stílus

## Navigáció

Az `index.html`, `sweep.html` és `drawing.html` fejlécében ugyanaz a háromelemű navigáció található. Emiatt a VS Code-ból megnyitott `index.html` az összes jelenlegi kísérlet belépési pontja.

## Ellenőrzött állapot

Az utolsó kézi böngészőteszt során:

- mindhárom oldal betöltődött;
- az indexről látható volt mindhárom kísérlet;
- a navigáció működött;
- a papírtér alapállapotban 25 vektoros rajzi elemet készített;
- a Rétegrend feloldás 45 rajzi elemre bontotta a lapot;
- az 1:50 → 1:100 léptékváltás újragenerálta a rajzot;
- a méretezés kikapcsolása eltávolította a három méretláncot;
- az A3 lap és a rajz vizuálisan rendben jelent meg.

## Tudatos korlátok

- A ház topológiája rögzített téglalap; még nincs általános fal- vagy térgráf.
- Egyetlen déli ablak van.
- A falrétegrend és a csomópont determinisztikus demonstráció, nem szabvány- vagy gyártói adatbázis.
- Az AI még nincs bekötve.
- A 3D csomópont egyszerű testekből épül, valódi poligon-boole és rétegprioritás nélkül.
- A papírtér csak egy alaprajzi lapot és egyszerű méretláncokat készít.
- Az oldalak ugyanazt a forrásmodellt használják, de az egyes HTML-oldalak közötti módosítások még nem perzisztensek.
- Nincs automatikus tesztkészlet.

## Javasolt következő kísérlet

A legjobb következő lépés valószínűleg nem egy nagy alkalmazásváz, hanem egy kicsi **általános alaprajzi igazságmodell**:

1. A rögzített téglalap helyett legyen szerkeszthető fal-/térgráf.
2. Felülnézetben lehessen sarokpontot vagy falszakaszt mozgatni.
3. Ugyanebből a gráfból épüljön a 2D nézet, az egyszerű 3D tömeg és a papírrajz.
4. Egy kiválasztott falhoz lehessen nyílást rendelni, ne csak a déli falhoz.
5. Ezután lehet kipróbálni az első valódi fókusz-skillt, például egy fürdőszobát vagy egy ablakcsomópontot.

A siker kritériuma nem az, hogy sok funkció legyen, hanem hogy egy geometriai változtatás után mindhárom reprezentáció konzisztensen ugyanabból az igazságból épüljön újra.

## Lehetséges későbbi irányok

- több lapos rajzkészlet, metszet és homlokzat mint új lekérdezés;
- SVG mellett natív PDF-generálás és később DXF/IFC-kimenet;
- automatikus feliratozás és ütközésmentes méretlánc-elhelyezés;
- „resolved proposal” és „designer-confirmed” állapot minden AI által feloldott döntéshez;
- lokális szakmai skillkészletek: fürdőszoba, tető/eresz, ablakcsomópont, akadálymentesség, tűzvédelem;
- a feloldások eredetének és bizonytalanságának látható nyilvántartása.

## Commit előtt

A `HANDOFF.md` ezen a munkameneten készült új fájl. Commit előtt érdemes ellenőrizni:

```bash
git status --short
git diff --stat
```

Másik gépen a folytatáshoz a commitot fel is kell pusholni, majd ott pull/clone után a fenti helyi webszerverrel indítható a projekt.
