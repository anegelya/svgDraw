// TODO: додати Ctrl в тих місцях де metaKey на слухачах подій;
// TODO: показувати поля форми лише після створення першого полігону;
// TODO: зробити обирання полігону при кліку лівою клавішою по полігону.
//       якщо це полігон, то робимо активним. якщо ні - то створюємо новий полігон;
// TODO: додати до свг конструктора метод для експорту;
// FIXME: полагодити поведінку полігонів при кліку на Ctrl

// абстрактний конструктор Редактору SVG

var scale;
var fileName;

function SVGEditor(DOM, options) {

    // створюємо полотно для малювання SVG
    var canvas = document.createElementNS("http://www.w3.org/2000/svg", 'svg');


    
    var wScale = window.innerWidth/options.width;
    var hScale = window.innerHeight/options.height;
    scale = wScale < hScale ? wScale : hScale;
    
    canvas.setAttribute('width', options.width*scale + "px");
    canvas.setAttribute('height', options.height*scale + "px");
    canvas.setAttribute('viewBox', '0 0 ' + options.width + ' ' + options.height);
    
    
    console.log(scale);
    

    

    fileName = options.fileName;
    canvas.style.backgroundImage = 'url(' + options.url + ')';


    // створюємо поточний елемент, який буде малюватись
    var polygon = null;

    // створюємо масив, де будуть зберігатись створені полігони
    var polygons = [];

    var editablePoint = null;
    
    // додаємо полотно до DOM
    DOM.appendChild(canvas);

    var form, exportForm;

    var X = canvas.getBoundingClientRect().left;
    var Y = canvas.getBoundingClientRect().top;

    // додаємо слухач на клік
    canvas.addEventListener('click', function(event) {
        event.stopPropagation();

        if(!form || !exportForm) {
            // створюємо нову форму дата-атрибутів
            form = new Form(DOM, options.fields);

            // створюємо форму експорту полотна
            exportForm = new ExportForm(DOM, polygons, {
                width: options.width,
                height: options.height
            }, options.sendTo, options.onSvgSent);
        }

        // отримуємо координати кліку
        var coords = {
            'x': (event.clientX - X)/scale,
            'y': (event.clientY - Y)/scale
        };

        // якщо немає поточного полігону
        if(!polygon && !event.metaKey) {

            // створюємо один полігон на полотні
            polygon = new Polygon(canvas);
            form.setPolygonTarget(polygon);

            options.fields.forEach(field => {
                if(polygon) {
                    polygon.editAttribute(field.attribute, field.default);
                }
            });

            // додаємо до нього нову точку в місці кліку
            polygon.addPoint(coords);
            polygons.push(polygon);

        } else if (event.metaKey) {
            var elem = event.target;

            // if(elem.nodeName == 'polygon') {
            //     polygons.forEach(polygonElem => {
            //         if(elem.getAttribute('points') === polygonElem.getPolygonCoords()) {
            //             polygon = polygonElem;
            //             polygon.makeActive();
            //             form.setPolygonTarget(polygon);
            //         }
            //     });
            // }
        } else if(event.shiftKey) {
            // додаємо точку із апроксимованими кутами
            polygon.addPoint(coords, true);
        } else if (event.ctrlKey) {
            // do nothing
            return;
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

            } else if(elem.nodeName == 'polygon') {
                var coords = {
                    'x': (event.clientX - X)/scale,
                    'y': (event.clientY - Y)/scale
                };

                polygons.forEach(polygonElem => {
                    if(elem.getAttribute('points') === polygonElem.getPolygonCoords()) {
                        polygon = polygonElem;
                        polygon.makeActive();
                        polygon.pauseDrawing(true);
                        form.setPolygonTarget(polygon);
                    }
                });
            }
        }
    });

    canvas.addEventListener('mouseup', function(event) {
        event.stopPropagation();
        event.preventDefault();

        if(event.metaKey) {
            editablePoint = null;
            if(polygon) polygon.nullDot();
        }
    });
    
    canvas.addEventListener('mousemove', function(event) {
        event.preventDefault();
        event.stopPropagation();
        var coords = {
            'x': (event.clientX - X)/scale,
            'y': (event.clientY - Y)/scale
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
                'x': (event.clientX - X)/scale,
                'y': (event.clientY - Y)/scale
            };
            polygon.addPoint(coords);
            editablePoint = null;
            DOM.classList.toggle('cursor');
        } else if(event.keyCode === 27 && polygon) {
            polygon.stopDraw();
            polygon = null;
        }
    });

    document.addEventListener('scroll', function(event){
        X = canvas.getBoundingClientRect().left;
        Y = canvas.getBoundingClientRect().top;
    });
}

// абстрактний конструктор Полігону
function Polygon(parentElem) {
    // створюємо SVG полігону
    var polygon = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
    
    polygon.setAttribute("vector-effect","non-scaling-stroke");
    polygon.style.opacity = '0.8';
    
    // створюємо масив із координатами точок полігону;
    var polygonCoords = [];

    var attributes = {};

    var editable = false;

    // додаємо полігон до батьківського елементу
    parentElem.appendChild(polygon);

    var dots = [];
    var dot = new Dot(parentElem);
    // dots.push(dot);

    this.getPolygonCoords = function() {
        var polygonPoints = "";
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y  + ' ';
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
            polygonPoints += elem.x + ',' + elem.y  + ' ';
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
            } else {
                polygonCoords.push(coords);
                dot.setCoords(coords);
            }
                
            polygonCoords.forEach(elem => {
                polygonPoints += elem.x + ',' + elem.y  + ' ';
            });

            polygon.setAttribute('points', polygonPoints);
        }
    }

    this.pauseDrawing = function(DoNotLastPoint) {
        var polygonPoints = "";
        if(!DoNotLastPoint) polygonCoords.pop();
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y  + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
        dot.delete();
        editable = true;
    }

    this.resumeDrawing = function() {
        dot = new Dot(parentElem);
        var polygonPoints = "";

        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y  + ' ';
        });

        polygon.setAttribute('points', polygonPoints);
        editable = false;
    }

    this.stopDraw = function() {
        var polygonPoints = "";
        polygonCoords.pop();
        polygonCoords.forEach(elem => {
            polygonPoints += elem.x + ',' + elem.y  + ' ';
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

    this.editAttribute = function(attribute, value) {
        polygon.setAttribute(attribute, value);
        attributes[attribute] = value;
    }

    this.seeAttribute = function(attribute) {
        return polygon.getAttribute(attribute);
    }

    this.export = function() {
        var obj = {
            tag: 'polygon',
            attributes: {
                class: 'polygon',
                points: ''
            }
        };

        polygonCoords.forEach(elem => {
            obj.attributes['points'] += elem.x + ',' + elem.y  + ' ';
        });

        for(var attrKey in attributes) {
            obj.attributes[attrKey] = attributes[attrKey];
        }

        return obj;
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

    dot.setAttribute("vector-effect","non-scaling-stroke");
    dot.setAttribute('r', 4);
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

// абстрактний конструктор Форми зміни дата-атрибутів
function Form(parentElem, fields) {
    var form = document.createElement('form');

    var polygonTarget = null;

    var fieldsArr = [];
    var update = new Event('update');

    fields.forEach(field => {
        var input = document.createElement('input');
        var label = document.createElement('label');

        input.setAttribute('type', 'text');
        input.setAttribute('placeholder', field.name);
        input.setAttribute('id', field.attribute);
        input.setAttribute('value', field.default);

        label.setAttribute('for', field.attribute);
        label.innerHTML = field.name;

        form.appendChild(label);
        form.appendChild(input);
        fieldsArr.push(input);

        input.addEventListener('keyup', function(event) {
            if(polygonTarget) {
                var value = event.target.value;
                polygonTarget.editAttribute(field.attribute, value);
            }
        });

        input.addEventListener('update', function(event) {
            if(polygonTarget) {
                input.value = polygonTarget.seeAttribute(field.attribute);
            }
        });
    });
    
    parentElem.appendChild(form);

    this.setPolygonTarget = function(polygon) {
        polygonTarget = polygon;

        fieldsArr.forEach(item => {
            item.dispatchEvent(update);
        });
    }
}

// абстрактний конструктор Форми експорту полотна
function ExportForm(parentElem, polygons, svgOptions, sendTo, onSvgSent) {
    var _this = this;
    var form = document.createElement('form');
    var exportButton = document.createElement('button');
    
    exportButton.setAttribute('type', 'submit');
    exportButton.innerHTML = "EXPORT";
    exportButton.classList = 'btn btn-success';

    form.appendChild(exportButton);
    parentElem.appendChild(form);

    form.addEventListener('submit', function(event){
        event.preventDefault();
        var exports = composeExports();
        _this.sendForm(exports);
    });

    function composeExports() {
        var exports = {
            tag: 'svg',
            attributes: {
                version: '1.1',
                x: '0px',
                y: '0px',
                width: svgOptions.width+'px',
                height: svgOptions.height+'px',
                viewBox: '0 0 '+svgOptions.width+' '+svgOptions.height,
                style: 'enable-background:new 0 0 '+svgOptions.width+' '+svgOptions.height
            },
            children: []
        };

        if(polygons !== []) {
            polygons.forEach(polygon => {
                var svgChild = polygon.export();


                exports.children.push(svgChild);
            });
        } else {
            throw 'Немає полігонів';
        }
        return exports;
    }

    this.sendForm = function(exportObj) {

        var form, xhr;
        form = new FormData();
        form.append("svg", JSON.stringify(exportObj));
        form.append("filename", fileName);
        xhr = new XMLHttpRequest();
        xhr.open('POST', sendTo);
        xhr.onload = function() {
            if (this.readyState === 4 && this.status === 200) {
                onSvgSent(this.responseText);
            } else {
                console.log(this.responseText);
            }
        };
        return xhr.send(form);
    }
}

