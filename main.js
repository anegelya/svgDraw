// TODO: додати поля, які б додавали дата-атрибути до полігонів
// абстрактний конструктор Редактору SVG
function SVGEditor(DOM, options) {
    // створюємо полотно для малювання SVG
    var canvas = document.createElementNS("http://www.w3.org/2000/svg", 'svg');

    // створюємо поточний елемент, який буде малюватись
    var polygon = null;

    // створюємо масив, де будуть зберігатись створені полігони
    var polygons = [];

    var editablePoint = null;
    
    // додаємо полотно до DOM
    DOM.appendChild(canvas);

    // додаємо слухач на клік
    canvas.addEventListener('click', function(event) {
        event.stopPropagation();

        // отримуємо координати кліку
        var coords = {
            'x': event.clientX,
            'y': event.clientY
        };

        // якщо немає поточного полігону
        if(!polygon && !event.metaKey) {

            // створюємо один полігон на полотні
            polygon = new Polygon(canvas);

            // додаємо до нього нову точку в місці кліку
            polygon.addPoint(coords);
            polygons.push(polygon);

        } else if (event.metaKey) {
            var elem = event.target;

            if(elem.nodeName == 'polygon') {
                polygons.forEach(polygonElem => {
                    if(elem.getAttribute('points') === polygonElem.getPolygonCoords()) {
                        polygon = polygonElem;
                        polygon.makeActive();
                    }
                });
            }
        } else if(event.shiftKey) {

            // додаємо точку із апроксимованими кутами
            polygon.addPoint(coords, true);
        } else {
            polygon.addPoint(coords);
        }
    });

    canvas.addEventListener('mousedown', function(event){
        event.stopPropagation();
        event.preventDefault();

        if(event.metaKey) {

            // отримуємо елемент, по якому відбувся клік
            var elem = event.target;

            if(elem.nodeName == 'circle') {
                var coords = {
                    'x': Number(elem.getAttribute('cx')),
                    'y': Number(elem.getAttribute('cy'))
                };

                var s = polygon.searchDot(coords);
                editablePoint = s.point;
            }
        }
    });

    canvas.addEventListener('mouseup', function(event) {
        event.stopPropagation();
        event.preventDefault();

        if(event.metaKey) {
            editablePoint = null;
            polygon.nullDot();
        }
    });
    
    canvas.addEventListener('mousemove', function(event) {
        event.preventDefault();
        event.stopPropagation();
        var coords = {
            'x': event.clientX,
            'y': event.clientY
        };

        if(polygon) {
            if(event.shiftKey) {
                polygon.draftPoint(coords, true);
            } else if(event.metaKey) {
                polygon.draftPoint(coords, false, editablePoint);
            } else {
                polygon.draftPoint(coords);
            }
        }
    });

    canvas.addEventListener('contextmenu', function(event){
        event.preventDefault();
        if(polygon) {
            polygon.stopDraw();
            polygon = null;
        }
    });

    document.addEventListener('keydown', function(event) {
        if(event.keyCode ==90 && event.metaKey) {
            console.log("Відміна");
        } else if (event.keyCode === 224) {
            if(polygon) polygon.pauseDrawing();
            DOM.classList.toggle('cursor');
        }
    });

    document.addEventListener('keyup', function(event){
        if(event.keyCode === 224 && polygon) {
            polygon.resumeDrawing();
            var coords = {
                'x': event.clientX,
                'y': event.clientY
            };
            polygon.addPoint(coords);
            editablePoint = null;
            DOM.classList.toggle('cursor');
        }
    });
}

// абстрактний конструктор Полігону
function Polygon(parentElem) {
    // створюємо SVG полігону
    var polygon = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
    polygon.style.opacity = '0.8';
    
    // створюємо масив із координатами точок полігону;
    var polygonCoords = [];

    var editablePoint = null;

    var editable = false;

    // додаємо полігон до батьківського елементу
    parentElem.appendChild(polygon);

    var dots = [];
    var dot = new Dot(parentElem);
    // dots.push(dot);

    this.getPolygonCoords = function() {
        var polygonPoints = "";
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y + ' ';
        });

        return polygonPoints;
    }

    this.addPoint = function(coords, options) {
        var polygonPoints = "",
            lastPoint = polygonCoords[polygonCoords.length - 2];

        var dot = new Dot(parentElem);
        dots.push(dot);

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

        return dot;
    }

    this.draftPoint = function(coords, approx, index) {
        if(editable) {
            var polygonPoints = "";
            polygonCoords[index] = coords;
            if(dot) dot.setCoords(coords);

            polygonCoords.forEach(elem => {
                polygonPoints += elem.x + ',' + elem.y + ' ';
            });

            polygon.setAttribute('points', polygonPoints);
        } else {
            var polygonPoints = "",
                lastPoint = polygonCoords[polygonCoords.length - 2];

            if(!index) {
                index = polygonCoords.length;
            }

            if(!dot) {
                dot = new Dot(parentElem);
            }
        
            if(polygonCoords.length > 1)  {
                polygonCoords.pop();
            }

            if(approx) {
                var newCoords = approxPoint(coords, lastPoint.x, lastPoint.y);
                dot.setCoords(newCoords);
                polygonCoords.push(newCoords);
            } else if(index) {
                polygonCoords[index] = coords;
                dot.setCoords(coords);
            }
                
            polygonCoords.forEach(elem => {
                polygonPoints += elem.x + ',' + elem.y + ' ';
            });

            polygon.setAttribute('points', polygonPoints);
        }
    }

    this.pauseDrawing = function() {
        var polygonPoints = "";
        polygonCoords.pop();
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
        dot.delete();
        editable = true;
    }

    this.resumeDrawing = function() {
        dot = new Dot(parentElem);
        var polygonPoints = "";

        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
        editable = false;
    }

    this.stopDraw = function() {
        var polygonPoints = "";
        polygonCoords.pop();
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
        polygon.style.opacity = '0.4';
        dot.delete();
    }

    this.makeActive = function() {
        polygon.style.opacity = '0.8';
    }

    this.nullDot = function() {
        dot = null;
    }

    this.searchDot = function(coords) {
        var result = {};
        dots.forEach(elem => {
            var dotCoords = elem.getCoords();
            if(dotCoords.x === coords.x && dotCoords.y === coords.y) {
                dot = elem;
                result.dot = elem;
            }
        });

        polygonCoords.forEach(point => {
            if(point.x === coords.x && point.y === coords.y) {
                result.point = polygonCoords.indexOf(point);
            }
        });

        return result;
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

// абстрактний конструктор Точки
function Dot(parentElem) {
    var dot = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    dot.setAttribute('r', "5");
    parentElem.appendChild(dot);

    this.getCoords = function() {
        var coords = {};
        coords.x = Number(dot.getAttribute('cx'));
        coords.y = Number(dot.getAttribute('cy'));

        return coords;
    }

    this.setCoords = function(coords) {
        if(coords.x && coords.y) {
            dot.setAttribute('cx', coords.x);
            dot.setAttribute('cy', coords.y);
        }
    }

    this.delete = function() {
        dot.remove();
    }
}