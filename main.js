// абстрактний конструктор Редактору SVG
function SVGEditor(DOM, options) {
    // створюємо полотно для малювання SVG
    var canvas = document.createElementNS("http://www.w3.org/2000/svg", 'svg');

    // створюємо поточний елемент, який буде малюватись
    var polygon = null;
    
    DOM.appendChild(canvas);

    DOM.addEventListener('click', function(event) {
        event.stopPropagation();
        var coords = {
            'x': event.clientX,
            'y': event.clientY
        };

        if(!polygon) {
            polygon = new Polygon(canvas);
            polygon.addPoint(coords);
        } else if(event.shiftKey) {
            polygon.addPoint(coords, true);
        }else {
            polygon.addPoint(coords);
        }
    });
    
    DOM.addEventListener('mousemove', function(event) {
        event.preventDefault();
        event.stopPropagation();
        var coords = {
            'x': event.clientX,
            'y': event.clientY
        };

        if(polygon) {
            if(event.shiftKey) {
                polygon.draftPoint(coords, true);
            } else {
                polygon.draftPoint(coords);
            }
        }
    });

    DOM.addEventListener('contextmenu', function(event){
        event.preventDefault();
        if(polygon) {
            polygon.stopDraw();
            polygon = null;
        }
    });

    document.addEventListener('keydown', function(event) {
        if(event.keyCode ==90 && event.metaKey) {
            console.log("Відміна");
        }
    });
}

// абстрактний конструктор Полігону
function Polygon(parentElem) {
    // створюємо SVG полігону
    var polygon = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
    
    // створюємо масив із координатами точок полігону;
    var polygonCoords = [];

    // створюємо чорновик крапки
    var draftDot = null;

    // додаємо полігон до батьківського елементу
    parentElem.appendChild(polygon);

    function Dot() {
        var dot = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        dot.setAttribute('r', "2");
        parentElem.appendChild(dot);

        dot.addEventListener('click', function(event){
            if(event.metaKey) {
                event.stopPropagation();
                console.log('hi');
            }
        });

        this.setCoords = function(coords) {
            dot.setAttribute('cx', coords.x);
            dot.setAttribute('cy', coords.y);
        }

        this.delete = function() {
            dot.remove();
        }
    }

    var dot = new Dot();

    this.addPoint = function(coords, options) {
        var polygonPoints = "",
            lastPoint = polygonCoords[polygonCoords.length - 2];

        var dot = new Dot();

        if(options) {
            var newCoords = approxPoint(coords, lastPoint.x, lastPoint.y);
            dot.setCoords(newCoords);
        } else {
            dot.setCoords(coords);
        }

        polygonCoords.push(coords);
        
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
    }

    this.draftPoint = function(coords, options) {
        var polygonPoints = "",
            lastPoint = polygonCoords[polygonCoords.length - 2];

        if(!dot) {
            dot = new Dot();
        } else if(polygonCoords.length>1) {
            polygonCoords.pop();
        }

        if(options) {
            var newCoords = approxPoint(coords, lastPoint.x, lastPoint.y);
            dot.setCoords(newCoords);
            polygonCoords.push(newCoords);
        } else {
            dot.setCoords(coords);
            polygonCoords.push(coords);
        }
            
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
    }

    this.stopDraw = function() {
        var polygonPoints = "";
        polygonCoords.pop();
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
        dot.delete();
    }

    function approxPoint(coords, x1, y1) {
        var polygonPoints = "",
            x = coords.x,
            y = coords.y,
            x2 = 0, 
            y2 = 0;

            
        if(Math.abs(y1-y)) {
            var realTg = Math.abs(x1-x)/Math.abs(y1-y);

            var sqrt3 = Math.sqrt(3);
            if(realTg <= sqrt3/2) {
                //from 0 to 30 degrees - horizontal
                y2 = y;
                x2 = x1;
            } else if(realTg > sqrt3/2 && realTg < sqrt3) {
                //from 31 to 59 degrees - diagonal
                    
                //if tangens > 1 => Math.abs(x1-x) > Math.abs(y1-y)   => Math.abs(x1-x) - this is larger distance // smae for Y in else statement
                if(realTg > 1) {
                    x2 = x;
                    y2 = y1 - (y1-y)*realTg;
                } else {
                    y2 = y;
                    x2 = x1 - (x1-x)*realTg;
                }
            } else {
                //from 60 to 90 degrees - vertical
                x2 = x;
                y2 = y1;
            }
        }
        var newCoords = {
            'x': x2,
            'y': y2
        };

        return newCoords;
    }
}