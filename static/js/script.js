let selectedShapes = [];
let groups = [];
let isDrawingLine = false;
let startShape = null;
let currentLine = null;

const stage = new Konva.Stage({
    container: 'konva-container',
    width: window.innerWidth - 200,
    height: window.innerHeight - 100,
});

const layer = new Konva.Layer();
stage.add(layer);

let canvasElements = [];
let selectedShape = null;
let shapeIdMap = {};
let shapeCounter = 1;
let currentDiagramId = null;

const SNAP_TOLERANCE = 25;

function randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const shapeStyles = {
    rectangle: {
        width: 50,
        height: 30,
        fill: '#a7f3d0',
        stroke: '#059669',
        strokeWidth: 2,
    },
    circle: {
        radius: 30,
        fill: '#bae6fd',
        stroke: '#0ea5e9',
        strokeWidth: 2,
    },
    triangle: {
        radius: 40,
        fill: '#ffd700',
        stroke: '#daa520',
        strokeWidth: 2,
    },
    'line-1g': {
        stroke: '#ec6363ff',
        strokeWidth: 2,
    },
    'line-10g': {
        stroke: '#93b0f7',
        strokeWidth: 2,
    },
    'ellipse': {
        radiusX: 10,
        radiusY: 6,
        fill: '#ffc107',
        stroke: '#e0a800',
        strokeWidth: 1,
    },
    'diamond': {
        sides: 4,
        radius: 30,
        fill: '#fcd34d',
        stroke: '#d97706',
        strokeWidth: 2,
    }

};

function addLabel(shape, text) {
    const container = document.getElementById('konva-container');
    if (!container) {
        console.error('Error: Konva container not found for label.');
        return;
    }

    if (!shape.customId) {
        shape.customId = text || `shape${shapeCounter}`;
    }

    const existinginput = container.querySelector(`input[data-shape-id = "${shape.id()}"]`);
    if (existinginput) {
        existinginput.remove();
    }

    let input = document.createElement('input');
    input.className = 'shape-label-input';
    input.setAttribute('data-shape-id', shape.id());
    input.setAttribute('data-custom-id', shape.customId);
    input.placeholder = 'Enter name (e.g., dut1)';
    input.value = shape.customId;
    input.style.width = '80px';
    input.style.position = 'absolute';
    input.style.zIndex = 1000;

    shapeIdMap[shape.id()] = shape.customId;

    function updateInputPosition() {
        const pos = shape.getAbsolutePosition();
        let shapeCenterX = pos.x;
        let shapeBottomY = pos.y;

        if (shape.className === 'Rect') {
            shapeCenterX = pos.x + shape.width() / 2;
            shapeBottomY = pos.y + shape.height();
            input.style.top = `${shapeBottomY + 10}px`;
            input.style.left = `${pos.x + 10}px`;
        } else if (shape.className === 'Circle') {
            shapeCenterX = pos.x;
            shapeBottomY = pos.y + shape.radius();
            input.style.top = `${shapeBottomY + 10}px`;
            input.style.left = `${shapeCenterX - 35}px`;
        } else if (shape.className === 'RegularPolygon' && shape.attrs.sides === 3) {
            shapeCenterX = pos.x;
            shapeBottomY = pos.y + shape.radius();
            input.style.top = `${shapeBottomY}px`;
            input.style.left = `${shapeCenterX - 40}px`;
        }
    }

    updateInputPosition();
    shape.on('dragmove', updateInputPosition);

    input.addEventListener('input', () => {
        const newId = input.value.trim() || `shape${shapeCounter}`;
        shape.customId = newId;
        shapeIdMap[shape.id()] = newId;
        input.setAttribute('data-custom-id', newId);
        console.log(`Updated shape(${shape.id()}) with customId: ${newId}`);
    });

    input.addEventListener('click', () => selectShape(shape));
    container.appendChild(input);

    return input;
}

function createGroupPropertiesPopup() {
    console.log("Selected shapes : ", selectedShapes.map(s => s.id()));
    const connectedLines = canvasElements.filter(el => {
        if (el.className !== 'Line') return false;
        const shape1 = selectedShapes.some(s => s.id() === el.attrs.shape1Id);
        const shape2 = selectedShapes.some(s => s.id() === el.attrs.shape2Id);
        return shape1 && shape2;
    });

    console.log("connected lines found ", connectedLines.length > 0 ? connectedLines.map(l => l.id()) : 'None');

    if (connectedLines.length === 0) {
        alert('please select shapes connected by a cable to form a group');
        return;
    }
    const cabelTypes = new Set(connectedLines.map(line => line.attrs.cabelType));
    if (cabelTypes.has('1G') && cabelTypes.has('10G')) {
        createCableTypeSelectionPopup((selectedCableType, line) => {
            showGroupPropertiesForm(selectedCableType, line);
            console.log("1G and 10G found and function called");
        });
    }
    else if (cabelTypes.has('1G')) {
        const line = connectedLines.find(l => l.attrs.cabelType === '1G');
        showGroupPropertiesForm('1G', line);
        console.log('only 1g cabel found and function called');
    }
    else if (cabelTypes.has('10G')) {
        const line = connectedLines.find(l => l.attrs.cabelType === '10G');
        showGroupPropertiesForm('10G', line);
        console.log('only 10g cabel found and function called');
    }
    else {
        alert('Please select shapes connected by a cable to form a group');
    }

}

function showGroupPropertiesForm(cabelType, line) {
    const container = document.getElementById('konva-container');
    if (!container) {
        console.error('Konva conatiner not found, cannot create the group');
        return;
    }
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
    <div class = "popup-content">
    <form id = "group-properties-form">
    <h3>Group Properties </h3>
    <label for = "group-name"> Group Name : </label>
    <input type = "text" id = "group-name" name = "group-name">
    <br>
    <br>
    <label for = "protocol-input"> Protocol : </label>
    <input type = "text" id = "protocol-input" name = "protocol" required>
    <br>
    <br>
    <label for = "transport-input"> Transport : </label>
    <input type = "text" id = "transport-input" name = "transport" required>
    <br>
    <br>
    <button type = "submit"> Create group </button>
    <button class = "close-btn"> Close </button>
    </form>
    </div>
    `;
    popup.style.position = 'absolute';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = 1000;
    popup.style.backgroundColor = '#e4e9edff';
    popup.style.border = '1px solid #282222ff';
    popup.style.padding = '20px';

    container.appendChild(popup);

    const centerX = (container.offsetWidth - popup.offsetWidth) / 2;
    const centerY = (container.offsetHeight - popup.offsetHeight) / 2;
    popup.style.top = `${centerY}px`;
    popup.style.left = `${centerX}px`;

    const form = popup.querySelector('#group-properties-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const groupName = form.querySelector('#group-name').value.trim();
        const protocol = form.querySelector('#protocol-input').value.trim();
        const transport = form.querySelector('#transport-input').value.trim();

        const groupId = randomUUID();
        const newGroup = {
            id: groupId,
            name: groupName,
            properties: {
                protocol: protocol,
                transport: transport,
                cabelType: cabelType,
            },
        };

        selectedShapes.forEach(shape => {
            if (!shape.groupIds) {
                shape.groupIds = [];
            }
            if (!shape.groupNames) {
                shape.groupNames = [];
            }
            shape.groupIds.push(groupId);
            shape.groupNames.push(groupName);
        });
        groups.push(newGroup);
        console.log('Group created : ', newGroup);

        selectedShapes.forEach(s => {
            s.stroke('black');
            s.strokeWidth(2);
        });
        const updateDivPosition = addGroupInfoDiv([...selectedShapes], newGroup, cabelType, line);
        if (line) {
            const startHandle = canvasElements.find(el => el.name === 'lineHandle' && el.lineId === line.id() && el.handleType === 'start');
            const endHandle = canvasElements.find(el => el.name === 'lineHandle' && el.lineId === line.id() && el.handleType === 'end');

            if (startHandle) startHandle.on('dragmove', updateDivPosition);
            if (endHandle) endHandle.on('dragmove', updateDivPosition);
        }

        console.log('group info div is called ');
        selectedShapes = [];
        if (typeof updateUI === 'function') {
            updateUI();
        }
        popup.remove();
        layer.draw();
    });

    popup.querySelector('.close-btn').addEventListener('click', () => {
        popup.remove();
    });
}

function createCableTypeSelectionPopup(onSelectCallback) {
    const container = document.getElementById('konva-container');
    if (!container) {
        console.error('konva container not found can not create popup');
        return;
    }

    const connectedLines = canvasElements.filter(el => {
        if (el.className !== 'Line') return false;
        const shape1IsSelected = selectedShapes.some(s => s.id() === el.attrs.shape1Id);
        const shape2IsSelected = selectedShapes.some(s => s.id() === el.attrs.shape2Id);
        return shape1IsSelected && shape2IsSelected;
    });
    const line1g = connectedLines.find(l => l.attrs.cabelType === '1G');
    const line10g = connectedLines.find(l => l.attrs.cabelType === '10G');
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
    <div class = "popup-content">
        <h3>Select Cable Type </h3>
        <p>Multiple cable types detected. Which cable type should this groups properties be associated with</p>
        <button id="select-1g-cable">1G Cable </button>
        <button id="select-10g-cable">10G Cable </button>
        <button class="close-btn">Close </button>
    </div>
    `;
    popup.style.position = 'absolute';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%,-50%)';
    popup.style.zIndex = 1001;
    popup.style.backgroundColor = '#e4e9edff';
    popup.style.border = '1px solid #282222ff';
    popup.style.padding = '20px';
    container.appendChild(popup);
    const btn1G = popup.querySelector('#select-1g-cable');
    const btn10G = popup.querySelector('#select-10g-cable');
    if (line1g) {
        btn1G.addEventListener('click', () => {
            onSelectCallback('1G', line1g);
            popup.remove();
        });
    }
    else {
        btn1G.disabled = true;
    }
    if (line10g) {
        btn10G.addEventListener('click', () => {
            onSelectCallback('10G', line10g);
            popup.remove();
        });
    }
    else {
        btn10G.disabled = true;
    }
    popup.querySelector('.close-btn').addEventListener('click', () => {
        popup.remove();
    });
}

function addGroupInfoDiv(groupShapes, groupData, cabelType, line) {
    const container = document.getElementById('konva-container');
    if (!container) {
        console.error('Konva conatiner not found, cannot create the group');
        return;
    }

    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-info';
    groupDiv.setAttribute('data-group-id', groupData.id);
    groupDiv.setAttribute('data-line-id', line ? line.id() : 'none');
    groupDiv.style.cssText = `
    position : absolute;
    font-size : 14px;
    pointer-events : none;
    z-index : 1000;
    transform-origin : center;
    white-space: nowrap;
    `;
    groupDiv.innerHTML = `
    <div> 
    ${groupData.properties.protocol} + 
    ${groupData.properties.transport} 
    (${cabelType})
    </div>
    `;
    container.appendChild(groupDiv);

    const updateDivPosition = () => {
        const linePoints = line.points();
        const lineX1 = linePoints[0];
        const lineY1 = linePoints[1];
        const lineX2 = linePoints[2];
        const lineY2 = linePoints[3];
        const lineMidX = (lineX1 + lineX2) / 2;
        const lineMidY = (lineY1 + lineY2) / 2;
        const lineAngle = Math.atan2(lineY2 - lineY1, lineX2 - lineX1);
        let finaly;
        if (cabelType === '1G') {
            finaly = lineMidY - 10;
        }
        else if (cabelType === '10G') {
            finaly = lineMidY + 10;
        }
        groupDiv.style.left = `${lineMidX}px`;
        groupDiv.style.top = `${finaly}px`;
        groupDiv.style.transform = `translate(-50%,-50%) rotate(${lineAngle}rad)`;
    };
    updateDivPosition();
    return updateDivPosition;

}

function createShape(type, centerX, centerY) {
    const shapeId = randomUUID();
    const defaultCustomId = `shape${shapeCounter++}`;

    let shape;

    switch (type) {
        case 'rectangle':
            shape = new Konva.Rect({
                ...shapeStyles.rectangle,
                x: centerX - 50,
                y: centerY - 30,
                draggable: true,
                id: shapeId,
            });
            break;

        case 'circle':
            shape = new Konva.Circle({
                ...shapeStyles.circle,
                x: centerX,
                y: centerY,
                draggable: true,
                id: shapeId,
            });
            break;

        case 'triangle':
            shape = new Konva.RegularPolygon({
                ...shapeStyles.triangle,
                x: centerX,
                y: centerY,
                sides: 3,
                draggable: true,
                id: shapeId,
            });
            break;

        case 'line-1g':
        case 'line-10g':
            // Line creation logic stays the same
            const x1 = centerX;
            const y1 = centerY;
            const x2 = x1 + 100;
            const y2 = y1;
            const lineId = randomUUID();

            const line = new Konva.Line({
                points: [x1, y1, x2, y2],
                stroke: shapeStyles[type].stroke,
                strokeWidth: shapeStyles[type].strokeWidth,
                id: lineId,
                name: 'connectionLine',
                shape1Id: null,
                shape2Id: null,
                cabelType: type === 'line-1g' ? '1G' : '10G'
            });

            // Handle creation for lines...
            const startHandle = new Konva.Circle({
                x: x1,
                y: y1,
                radius: 6,
                fill: 'blue',
                draggable: true,
                name: 'lineHandle',
                lineId: lineId,
                handleType: 'start',
            });

            const endHandle = new Konva.Circle({
                x: x2,
                y: y2,
                radius: 6,
                fill: 'blue',
                draggable: true,
                name: 'lineHandle',
                lineId: lineId,
                handleType: 'end',
            });

            startHandle.on('dragmove', () => updateHandle(line, startHandle, 'start'));
            startHandle.on('dragend', () => {
                snapToShape(startHandle);
                updateHandle(line, startHandle, 'start');
                layer.draw();
            });

            endHandle.on('dragmove', () => updateHandle(line, endHandle, 'end'));
            endHandle.on('dragend', () => {
                snapToShape(endHandle);
                updateHandle(line, endHandle, 'end');
                layer.draw();
            });

            canvasElements.push(line, startHandle, endHandle);
            layer.add(line, startHandle, endHandle);
            layer.draw();
            return line;
        default:
            return null;
    }
    canvasElements.push(shape);
    layer.add(shape);
    return shape;
}

function updateHandle(line, handle, type) {
    console.log(`updateHandle called - type: ${type}`);

    const pos = handle.getAbsolutePosition();
    console.log(`Handle position: x=${pos.x}, y=${pos.y}`);

    const currentPoints = line.points();
    console.log(`Current line points: [${currentPoints.join(', ')}]`);

    // Update line points immediately for visual feedback
    if (type === 'start') {
        console.log(`Updating START handle - new points: [${pos.x}, ${pos.y}, ${currentPoints[2]}, ${currentPoints[3]}]`);
        line.points([pos.x, pos.y, currentPoints[2], currentPoints[3]]);
    } else if (type === 'end') {
        console.log(`Updating END handle - new points: [${currentPoints[0]}, ${currentPoints[1]}, ${pos.x}, ${pos.y}]`);
        line.points([currentPoints[0], currentPoints[1], pos.x, pos.y]);
    }

    console.log(`Line points after update: [${line.points().join(', ')}]`);

    // Rest of your existing connection logic...
    const connectedShape = canvasElements.find(
        (shape) => shape.className !== 'Line' &&
            typeof shape.getClientRect === 'function' &&
            Konva.Util.haveIntersection(shape.getClientRect(), {
                x: pos.x, y: pos.y, width: 1, height: 1,
            })
    );

    if (connectedShape) {
        const shapeId = connectedShape.id();
        const customId = connectedShape.customId || null;

        if (type === 'start') {
            line.setAttrs({ shape1Id: shapeId });
        } else if (type === 'end') {
            line.setAttrs({ shape2Id: shapeId });
        }

        else {
            if (type === 'start') {
                line.setAttrs({ shape1Id: null });
            } else if (type === 'end') {
                line.setAttrs({ shape2Id: null });
            }
        }

        console.log(`Connected ${type} of line ${line.id()} to shape ${shapeId}, customId: ${customId || '(none)'}`);
    } else {
        console.warn(`No shape found under ${type} handle of line ${line.id()}`);
        if (type === 'start') {
            line.shape1Id = null;
        } else if (type === 'end') {
            line.shape2Id = null;
        }
    }

    // Force redraw
    console.log(`Calling layer.draw()`);
    layer.draw();
}

function addShape(type) {
    const centerX = stage.width() / 2;
    const centerY = stage.height() / 2;

    if (type === 'ellipse' || type === 'diamond') {
        if (selectedShapes.length !== 2) {
            alert('please select exactly two shapes to add a lag point');
            return;
        }

        const connectedLines = canvasElements.filter(el => {
            if (el.className !== 'Line') return false;
            const shape1 = selectedShapes.some(s => s.id() === el.attrs.shape1Id);
            const shape2 = selectedShapes.some(s => s.id() === el.attrs.shape2Id);
            return shape1 && shape2;
        });
        if (connectedLines.length === 0) {
            alert('The selected shapes are not connected to a cable');
            return;
        }
        const has1G = connectedLines.some(line => line.attrs.cabelType === '1G');
        const has10G = connectedLines.some(line => line.attrs.cabelType === '10G');
        if (has1G && has10G) {
            createCableTypeSelectionPopup((selectedCableType, line) => {
                if (line) {
                    if (type === 'ellipse') {
                        createLagPoint(line);
                    }
                    else if (type === 'diamond') {
                        createCfmPoint(line);
                    }
                }
            });
        }
        else if (has1G) {
            const line = connectedLines.find(l => l.attrs.cabelType === '1G');
            if (line) {
                if (type === 'ellipse') {
                    createLagPoint(line);
                }
                else if (type === 'diamond') {
                    createCfmPoint(line);
                }
            }
        }
        else if (has10G) {
            const line = connectedLines.find(l => l.attrs.cabelType === '10G');
            if (line) {
                if (type === 'ellipse') {
                    createLagPoint(line);
                }
                else if (type === 'diamond') {
                    createCfmPoint(line);
                }
            }
        }
    }
    else {
        let shape = createShape(type, centerX, centerY);

        if (shape && shape.className !== 'Line') {
            shape.on('click', () => selectShape(shape));
            shape.on('dragend', updateElementConnections);
            canvasElements.push(shape);
            layer.add(shape);
            addLabel(shape, shape.customId);
        }
    }
    layer.draw();
}

function createLagPoint(line) {
    const lagPointId = randomUUID();
    const linepoints = line.points();
    const x1 = linepoints[0];
    const y1 = linepoints[1];
    const x2 = linepoints[2];
    const y2 = linepoints[3];
    const startX = (x1 + x2) / 2;
    const startY = (y1 + y2) / 2;
    const lagpoint = new Konva.Ellipse({
        x: startX,
        y: startY,
        radiusX: 6,
        radiusY: 10,
        fill: '#f4a60afb',
        stroke: '#a8a59cff',
        strokeWidth: 1,
        draggable: true,
        name: 'lagPoint',
        id: lagPointId,
        lineId: line.id(),
        relativePosition: 0.5,
    });
    lagpoint.dragBoundFunc(function (pos) {
        const newX = pos.x;
        const newY = pos.y;
        const lineVectorX = x2 - x1;
        const lineVectorY = y2 - y1;
        const pointVectorX = newX - x1;
        const pointVectorY = newY - y1;
        const lineLengthsq = lineVectorX * lineVectorX + lineVectorY * lineVectorY;
        let t = (pointVectorX * lineVectorX + pointVectorY * lineVectorY) / lineLengthsq;
        t = Math.max(0, Math.min(1, t));
        const constrainedX = x1 + t * lineVectorX;
        const constrainedY = y1 + t * lineVectorY;
        this.setAttr('relativePosition', t);
        return {
            x: constrainedX,
            y: constrainedY,
        };
    });
    layer.add(lagpoint);
    canvasElements.push(lagpoint);
    layer.draw();

    const startHandle = canvasElements.find(el => el.name === 'lineHandle' && el.lineId === line.id() && el.handleType === 'start');
    const endHandle = canvasElements.find(el => el.name === 'lineHandle' && el.lineId === line.id() && el.handleType === 'end');
    const updateLagPointPosition = () => {
        const currentLinePoints = line.points();
        const currentLineX1 = currentLinePoints[0];
        const currentLineY1 = currentLinePoints[1];
        const currentLineX2 = currentLinePoints[2];
        const currentLineY2 = currentLinePoints[3];
        const lineVectorX = currentLineX2 - currentLineX1;
        const lineVectorY = currentLineY2 - currentLineY1;
        const t = lagpoint.getAttr('relativePosition');
        const newX = currentLineX1 + t * lineVectorX;
        const newY = currentLineY1 + t * lineVectorY;
        lagpoint.position({
            x: newX,
            y: newY,
        });
        layer.draw();
    };
    if (startHandle) startHandle.on('dragmove', updateLagPointPosition);
    if (endHandle) endHandle.on('dragmove', updateLagPointPosition);
}

function createCfmPoint(line) {
    const cfmPointId = randomUUID();
    const linepoints = line.points();
    const x1 = linepoints[0];
    const y1 = linepoints[1];
    const x2 = linepoints[2];
    const y2 = linepoints[3];
    const startX = (x1 + x2) / 2;
    const startY = (y1 + y2) / 2;
    const cfmpoint = new Konva.RegularPolygon({
        x: startX,
        y: startY,
        sides: 4,
        radius: 10,
        fill: '#6a5acd',
        stroke: '#483d8b',
        strokeWidth: 2,
        draggable: true,
        name: 'cfmPoint',
        id: cfmPointId,
        lineId: line.id(),
        relativePosition: 0.5,
    });
    cfmpoint.dragBoundFunc(function (pos) {
        const newX = pos.x;
        const newY = pos.y;
        const lineVectorX = x2 - x1;
        const lineVectorY = y2 - y1;
        const pointVectorX = newX - x1;
        const pointVectorY = newY - y1;
        const lineLengthsq = lineVectorX * lineVectorX + lineVectorY * lineVectorY;
        let t = (pointVectorX * lineVectorX + pointVectorY * lineVectorY) / lineLengthsq;
        t = Math.max(0, Math.min(1, t));
        const constrainedX = x1 + t * lineVectorX;
        const constrainedY = y1 + t * lineVectorY;
        this.setAttr('relativePosition', t);
        return {
            x: constrainedX,
            y: constrainedY,
        };
    });
    layer.add(cfmpoint);
    canvasElements.push(cfmpoint);
    layer.draw();

    const startHandle = canvasElements.find(el => el.name === 'lineHandle' && el.lineId === line.id() && el.handleType === 'start');
    const endHandle = canvasElements.find(el => el.name === 'lineHandle' && el.lineId === line.id() && el.handleType === 'end');
    const updatecfmPointPosition = () => {
        const currentLinePoints = line.points();
        const currentLineX1 = currentLinePoints[0];
        const currentLineY1 = currentLinePoints[1];
        const currentLineX2 = currentLinePoints[2];
        const currentLineY2 = currentLinePoints[3];
        const lineVectorX = currentLineX2 - currentLineX1;
        const lineVectorY = currentLineY2 - currentLineY1;
        const t = cfmpoint.getAttr('relativePosition');
        const newX = currentLineX1 + t * lineVectorX;
        const newY = currentLineY1 + t * lineVectorY;
        cfmpoint.position({
            x: newX,
            y: newY,
        });
        layer.draw();
    };
    if (startHandle) startHandle.on('dragmove', updatecfmPointPosition);
    if (endHandle) endHandle.on('dragmove', updatecfmPointPosition);
}

function selectShape(shape) {
    if (shape.className === 'Line' || shape.className === 'lineHandle') return;
    const index = selectedShapes.indexOf(shape);
    if (index > -1) {
        selectedShapes.splice(index, 1);
        shape.stroke('black');
        shape.strokeWidth(3);
    }
    else {
        selectedShapes.push(shape);
        shape.stroke('red');
        shape.strokeWidth(3);
    }
    updateUI();
    layer.draw();
}

function updateUI() {
    if (selectedShapes.length === 1) {
        const selected = selectedShapes[0];
        document.getElementById('delete-selected-btn').disabled = false;
        document.getElementById('duplicate-selected-btn').disabled = false;
        document.getElementById('assign-group-btn').disabled = true;
        const infoDiv = document.getElementById('info-div');
        if (infoDiv) {
            infoDiv.innerHTML = `
            <h3> Selected shape Info </h3>
            <p>ID : ${selected.id()}</p>
            <p>Group : ${selected.groupName || 'None'}</p>
            `;
        }
        selectedShape = selected;
    }
    else if (selectedShapes.length > 1) {
        document.getElementById('delete-selected-btn').disabled = false;
        document.getElementById('duplicate-selected-btn').disabled = true;
        document.getElementById('assign-group-btn').disabled = false;
        const infoDiv = document.getElementById('info-div');
        if (infoDiv) {
            infoDiv.innerHTML = `<h3> Multiple Shapes selected </h3>`;
        }
        selectedShape = null;
    }
    else {
        document.getElementById('delete-selected-btn').disabled = true;
        document.getElementById('duplicate-selected-btn').disabled = true;
        document.getElementById('assign-group-btn').disabled = true;
        const infoDiv = document.getElementById('info-div');
        if (infoDiv) {
            infoDiv.innerHTML = `<h3> No Shapes selected </h3>`;
        }
    }
}


function updateElementConnections() {
    const elementMap = new Map();
    canvasElements.forEach(element => {
        elementMap.set(element.id(), element);
    });

    canvasElements.forEach((element) => {
        if (element.className === 'Line') {
            const shape1 = elementMap.get(element.attrs.shape1Id);
            const shape2 = elementMap.get(element.attrs.shape2Id);
            if (shape1 && shape2) {
                element.points([shape1.x(), shape1.y(), shape2.x(), shape2.y()]);
            }
        }
    });
    const container = document.getElementById('konva-conatiner');
    canvasElements.forEach(element => {
        if (!element || !['Rect', 'Circle', 'RegularPolygon'].includes(element.className)) return;
        const pos = element.getAbsolutePosition();
        const input = document.querySelector(`.shape-label-input[data-shape-id="${element.id()}"]`);
        if (input) {
            let shapeCenterX = pos.x;
            let shapeBottomY = pos.y;
            let offsetTop = 10;
            let offsetLeft = 10;

            if (element.className === 'Rect') {
                shapeCenterX = pos.x + element.width() / 2;
                shapeBottomY = pos.y + element.height();
            } else if (element.className === 'Circle') {
                shapeCenterX = pos.x;
                shapeBottomY = pos.y + element.radius();
                offsetLeft = -35;
            } else if (element.className === 'RegularPolygon' && element.attrs.sides === 3) {
                shapeCenterX = pos.x;
                shapeBottomY = pos.y + element.radius();
                offsetTop = 0;
                offsetLeft = -40;
            }
            input.style.top = `${shapeBottomY + offsetTop}px`;
            input.style.left = `${shapeCenterX + offsetLeft}px`;
        }
    });
    layer.draw();
}

function createPseudowirePopup(startShape,endShape){
    const container = document.getElementById('konva-conatiner');
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
    <div class="popup-content">
    <form id="pseudowire-properties">
        <h3>PseudoWire Properties</h3>
        <label for="protocol-input">Protocol : </label>
        <input type="text" id="protocol-input" required>
        <br>
        <br>
        <label for="service-input">Emulated Service : </label>
        <input type="text" id="service-input">
        <br>
        <br>
        <label for="Label-input">MPLS Label : </label>
        <input type="number" id="Label-input">
        <br>
        <br>
        <button type="submit">Create PseudoWire</button>
        <button class="close-btn">Close</button>
    </form>
    </div>
    `;
    container.appendChild(popup);
    const form = popup.querySelector('#pseudowire-properties');
    form.addEventListener('submit',(e)=>{
        e.preventDefault();
        const protocol = document.getElementById('protocol-input').value;
        const service = document.getElementById('service-input').value;
        const label = document.getElementById('label-input').value;

        createPseudowire(startShape,endShape,{
            protocol:protocol,
            emulatedService: service,
            mplsLabel: label,
        });
        popup.remove();
        selectedShapes = [];
        layer.draw();
    });
    popup.querySelector('.close-btn').addEventListener('click',() => popup.remove());
}

function createPseudowire(startShape,endShape,properties){
    const pseudoWireId = randomUUID();

    const line = new Konva.Line({
        points : [startShape.x(),startShape.y(),endShape.x(),endShape.y()],
        stroke : 'purple',
        strokeWidth : 3,
        dash : [10,5],
        id : pseudoWireId,
        name : 'pseudowire',
        shape1Id : startShape.id(),
        shape2Id : endShape.id(),
        properties : properties,
    });

    canvasElements.push(line);
    layer.add(line);
    layer.draw();
}

document.getElementById('add-pseudowire-btn').addEventListener('click',()=>{
    if(selectedShapes.length === 2){
        createPseudowirePopup(selectedShapes[0],selectedShapes[1]);
    }
    else{
        alert('Please select exactly two shapes to create a pseudowire');
    }
})

function generateTopologyJSON() {
    const topology = {
        groups: [],
    };
    const shapes = canvasElements.filter(el => ['Rect', 'Circle', 'RegularPolygon'].includes(el.className));
    const lines = canvasElements.filter(el => el.className === 'Line' && (el.attrs.name === "connectionLine" || el.attrs.name === "pseudowire"));
    const lagPoints = canvasElements.filter(el => el.name === 'lagPoint');
    const cfmPoints = canvasElements.filter(el => el.name === 'cfmPoint');

    console.log("Found lines : ",lines);
    console.log("Found lag points ",lagPoints);
    console.log("found cfm points : ",cfmPoints);

    groups.forEach(group => {
        const groupShapes = shapes.filter(s => s.groupIds && s.groupIds.includes(group.id)).map(s => s.customId);
        const groupConnections = lines.filter(line => {
            const shape1 = shapes.find(s => s.id() === line.attrs.shape1Id);
            const shape2 = shapes.find(s => s.id() === line.attrs.shape2Id);
            if(line.attrs.name === 'pseudowire'){
                return shape1 && shape2 && shape1.groupIds && shape1.groupIds.includes(group.id) && shape2.groupIds && shape2.groupIds.includes(group.id);
            }
            return shape1 && shape2 && shape1.groupIds && shape1.groupIds.includes(group.id) && shape2.groupIds && shape2.groupIds.includes(group.id) && line.attrs.cabelType === group.properties.cabelType;
        }).map(line => {
            const shape1 = shapes.find(s => s.id() === line.attrs.shape1Id);
            const shape2 = shapes.find(s => s.id() === line.attrs.shape2Id);
            const lineLagpoints = lagPoints.filter(lp => lp.getAttr('lineId') === line.id()).map(lp => ({
                type: 'lagPoint', 
                id: lp.id(),
                relativePosition: lp.getAttr('relativePosition')
            }));
            const linecfmpoints = cfmPoints.filter(cp => cp.getAttr('lineId') === line.id()).map(cp => ({
                type: 'cfmPoint', 
                id: cp.id(),
                relativePosition: cp.getAttr('relativePosition')
            }));

            if(line.attrs.name === 'pseudowire'){
                return{
                    from : shape1.customId,
                    to : shape2.customId,
                    type : 'pseudowire',
                    properties : line.attrs.properties,
                };
            }

            console.log(`Line ${line.id()} has lag points : `,lineLagpoints);
            console.log(`line ${line.id()} has cfm points : `,linecfmpoints);
            const connection = {
                from: shape1.customId,
                to: shape2.customId,
            };
            const linepoints = [...lineLagpoints,...linecfmpoints];
            if(linepoints.length > 0){
                connection.linePoints = linepoints;
            }
            return connection;
        });

        topology.groups.push({
            id: group.id,
            name: group.name,
            properties: group.properties,
            shapes: groupShapes,
            connections: groupConnections
        });
    });

    const jsonoutput = JSON.stringify(topology, null, 2);
    console.log(jsonoutput);
    alert('Topology JSON generated', jsonoutput);
    return jsonoutput;
}

document.getElementById('generate-script-btn').addEventListener('click', async () => {
    generateTopologyJSON();
});

document.getElementById('assign-group-btn').addEventListener('click', async () => {
    createGroupPropertiesPopup();
});

function snapToShape(handle) {
    let closest = null;
    let minDist = SNAP_TOLERANCE;
    canvasElements.forEach((shape) => {
        if (['Rect', 'Circle', 'RegularPolygon'].includes(shape.className)) {
            const dx = handle.x() - shape.x();
            const dy = handle.y() - shape.y();
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                closest = shape;
                minDist = dist;
            }
        }
    });
    return closest;
}


document.getElementById('save-btn').addEventListener('click', async () => {
    const generatedScript = generateTopologyJSON();
    const diagramName = document.getElementById('diagram-name').value.trim();

    const saveData = {
        name: diagramName,
        elements: canvasElements.map((el) => {
            const obj = el.toObject();
            if (el.customId) {
                obj.attrs.customId = el.customId;
            }
            if (el.className === 'Line') {
                obj.attrs.shape1Id = el.shape1Id || null;
                obj.attrs.shape2Id = el.shape2Id || null;
                obj.attrs.protocol = el.protocol || null;
                obj.attrs.transport = el.transport || null;
            }
            return obj;
        }),
        script: generatedScript,
    };

    console.log('Final Save Data:', saveData);

    try {
        const response = await fetch('/api/diagrams/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify(saveData),
        });
        const result = await response.json();
        console.log('Saved:', result);
        currentDiagramId = result.id;
        alert('Diagram saved successfully');
    } catch (error) {
        console.error('Save Failed:', error);
        alert('Save failed!');
    }
});

document.getElementById('erase-btn').addEventListener('click', () => {
    canvasElements.forEach((el) => el.destroy());
    canvasElements = [];
    selectedShape = null;
    shapeIdMap = {};
    shapeCounter = 1;

    const container = document.getElementById('konva-container');
    Array.from(container.querySelectorAll('.shape-label-input')).forEach((input) => input.remove());

    document.getElementById('delete-selected-btn').disabled = true;
    document.getElementById('duplicate-selected-btn').disabled = true;
    layer.draw();
    document.getElementById('diagram-name').value = '';
});

const loadBtn = document.getElementById('load-btn');
const loadDiagramSelect = document.getElementById('load-diagram-select');
loadBtn.addEventListener('click', async () => {
    loadDiagramSelect.style.display = loadDiagramSelect.style.display === 'none' ? 'block' : 'none';
    if (loadDiagramSelect.style.display === 'block') {
        await populateLoadDiagramSelect();
    }
});

async function populateLoadDiagramSelect() {
    loadDiagramSelect.innerHTML = '<option value=""> --Select Diagram--</option>';
    try {
        const response = await fetch('/api/diagrams/');
        if (!response.ok) throw new Error('Failed to fetch diagrams');

        const diagrams = await response.json();
        diagrams.forEach((diagram) => {
            const option = document.createElement('option');
            option.value = diagram.id;
            option.textContent = diagram.name;
            loadDiagramSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading diagrams : ', error);
        loadDiagramSelect.innerHTML = '<option value = ""> Failed to load </option>';
    }
}

loadDiagramSelect.addEventListener('change', async (e) => {
    const diagramId = e.target.value;
    if (!diagramId) return;

    canvasElements.forEach((el) => el.destroy());
    canvasElements = [];
    layer.destroyChildren();
    selectedShape = null;
    shapeIdMap = {};

    const container = document.getElementById('konva-container');
    Array.from(container.querySelectorAll('.shape-label-input')).forEach((input) => input.remove());

    layer.draw();

    try {
        const response = await fetch(`/api/diagrams/${diagramId}`);
        if (!response.ok) throw new Error(`Failed to load diagram ID: ${diagramId}`);
        const diagram = await response.json();
        console.log('Loaded diagram from server:', diagram);

        const loadedShapes = new Map();
        diagram.elements.forEach((objData) => {
            if (objData.className !== 'Line' && objData.name !== 'lineHandle') {
                let shape;
                if (objData.className === 'Rect') {
                    shape = new Konva.Rect(objData.attrs);
                } else if (objData.className === 'Circle') {
                    shape = new Konva.Circle(objData.attrs);
                } else if (objData.className === 'RegularPolygon') {
                    shape = new Konva.RegularPolygon(objData.attrs);
                } else {
                    console.warn(`Unknown shape type encountered in first pass: ${objData.className}`);
                    return;
                }
                shape.customId = objData.attrs?.customId;
                shape.isDiamond = objData.attrs?.isDiamond || false;
                if (shape.isDiamond) {
                    shape.protocol = objData.attrs?.protocol;
                    shape.transport = objData.attrs?.transport;
                }
                shapeIdMap[shape.id()] = shape.customId;
                shape.on('click', () => selectShape(shape));
                shape.on('dragend', updateElementConnections);
                layer.add(shape);
                canvasElements.push(shape);
                addLabel(shape, shape.customId);
                loadedShapes.set(shape.id(), shape);
            }
        });

        diagram.elements.forEach((objData) => {
            if (objData.className === 'Line') {
                const line = new Konva.Line(objData.attrs);

                line.shape1Id = objData.attrs?.shape1Id || null;
                line.shape2Id = objData.attrs?.shape2Id || null;
                line.protocol = objData.attrs?.protocol || null;
                line.transport = objData.attrs?.transport || null;

                const storedPoints = objData.attrs.points;
                let x1 = storedPoints[0];
                let y1 = storedPoints[1];
                let x2 = storedPoints[2];
                let y2 = storedPoints[3];

                const startHandle = new Konva.Circle({
                    x: x1,
                    y: y1,
                    radius: 6,
                    fill: 'blue',
                    draggable: true,
                    name: 'lineHandle',
                    lineId: line.id(),
                    handleType: 'start',
                });
                const endHandle = new Konva.Circle({
                    x: x2,
                    y: y2,
                    radius: 6,
                    fill: 'blue',
                    draggable: true,
                    name: 'lineHandle',
                    lineId: line.id(),
                    handleType: 'end',
                });

                startHandle.on('dragmove', () => updateHandle(line, startHandle, 'start'));
                startHandle.on('dragend', () => {
                    updateHandle(line, startHandle, 'start');
                    snapToShape(startHandle);
                    layer.draw();
                });
                endHandle.on('dragmove', () => updateHandle(line, endHandle, 'end'));
                endHandle.on('dragend', () => {
                    updateHandle(line, endHandle, 'end');
                    snapToShape(endHandle);
                    layer.draw();
                });

                layer.add(line, startHandle, endHandle);
                canvasElements.push(line, startHandle, endHandle);
            }
        });
        updateElementConnections();
        layer.draw();
        document.getElementById('diagram-name').value = diagram.name;
        currentDiagramId = diagramId;
    } catch (error) {
        console.error('Error loading diagram:', error);
        alert('Failed to load diagram!');
    }
});

document.getElementById('delete-selected-btn').addEventListener('click', () => {
    if (selectedShape) {
        const shapeId = selectedShape.id();
        const container = document.getElementById('konva-container');
        const inputs = container.querySelectorAll('.shape-label-input');
        inputs.forEach(input => {
            if (input.value === selectedShape.customId) {
                input.remove();
            }
        });
        delete shapeIdMap[shapeId];
        canvasElements = canvasElements.filter((el) => {
            if (el.className === 'Line') {
                if (el.shape1Id === shapeId || el.shape2Id === shapeId) {
                    const points = el.points();
                    canvasElements.forEach((handle) => {
                        if (handle instanceof Konva.Circle && ((handle.x() === points[0] && handle.y() === points[1]) || (handle.x() === points[2] && handle.y() === points[3]))) {
                            handle.destroy();
                        }
                    });
                    el.destroy();
                    return false;
                }
            }
            else if (el instanceof Konva.Circle && ((el.x() === selectedShape.x() && el.y() === selectedShape.y()) || (el.x() === selectedShape.x() + selectedShape.width() && el.y() === selectedShape.y()))) {
                el.destroy();
                return false;
            }
            return true;
        });
        selectedShape.destroy();
        canvasElements = canvasElements.filter((el) => el !== selectedShape);
        selectedShape = null;
        document.getElementById('delete-selected-btn').disabled = true;
        document.getElementById('duplicate-selected-btn').disabled = true;
        updateElementConnections();
        layer.draw();
    }
});

document.getElementById('duplicate-selected-btn').addEventListener('click', () => {
    if (selectedShape && selectedShape.className !== 'Line') {
        const data = selectedShape.toObject();
        data.attrs.x += 20;
        data.attrs.y += 20;
        data.attrs.id = randomUUID();
        data.attrs.customId = `shape${shapeCounter++}`;
        let newShape;
        if (selectedShape.className === 'Rect') newShape = new Konva.Rect(data.attrs);
        else if (selectedShape.className === 'Circle') newShape = new Konva.Circle(data.attrs);
        else if (selectedShape.className === 'RegularPolygon') newShape = new Konva.RegularPolygon(data.attrs);
        newShape.on('click', () => selectShape(newShape));
        newShape.on('dragend', updateElementConnections);
        canvasElements.push(newShape);
        layer.add(newShape);
        addLabel(newShape, newShape.customId);
        layer.draw();
    }
});

document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!currentDiagramId) {
        alert('No diagram loaded to delete.');
        return;
    }
    try {
        const response = await fetch(`/api/diagrams/${currentDiagramId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            },
        });
        if (response.ok) {
            alert('Diagram deleted successfully.');
            currentDiagramId = null;
            canvasElements.forEach((el) => el.destroy());
            canvasElements = [];
            selectedShape = null;
            shapeIdMap = {};

            const container = document.getElementById('konva-container');
            Array.from(container.querySelectorAll('.shape-label-input')).forEach((input) => input.remove());

            document.getElementById('delete-selected-btn').disabled = true;
            document.getElementById('duplicate-selected-btn').disabled = true;
            layer.draw();
            document.getElementById('diagram-name').value = '';
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete diagram.');
    }
});

['png', 'jpeg'].forEach((format) => {
    const buttonId = `export-${format === 'jpeg' ? 'jpg' : format}-btn`;
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.addEventListener('click', () => {
        try {
            const datauri = stage.toDataURL({ pixelRatio: 2 });
            const a = document.createElement('a');
            a.download = `duct_topology.${format}`;
            a.href = datauri;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error(`Export ${format} failed: `, error);
            alert(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
        }
    });
});

document.getElementById('export-pdf-btn').addEventListener('click', () => {
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.addImage(uri, 'PNG', 10, 10, 180, 160);
    pdf.save('duct_topology.pdf');
});

// Cookie Helper Function
function getCookie(name) {
    const cookie = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

// DOMContentLoaded Event Listener
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.draggable-shape').forEach((item) => {
        const type = item.dataset.shapeType;
        const handleAdd = () => addShape(type);
        item.addEventListener('click', handleAdd);
        item.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleAdd();
        });
        item.addEventListener('dblclick', handleAdd);
    });
});
