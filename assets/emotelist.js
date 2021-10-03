import emoteCreators from "./emotecreators.json";

console.log(emoteCreators);

const table = document.createElement('table');
document.body.appendChild(table);
const thead = document.createElement('tr');
table.appendChild(thead);
['emote', 'original', 'october', 'december'].forEach((header) => {
    const th = document.createElement('th');
    th.innerText = header;
    thead.appendChild(th);
});

Object.entries(emoteCreators.default).forEach(([name, creators]) => {
    const row = document.createElement('tr');
    table.appendChild(row);
    [name, creators.createdby, creators.october, creators.december].forEach((creator) => {
        const col = document.createElement('td');
        col.innerText = creator;
        if (creator === '') {
            col.classList.add('missing');
        }
        row.appendChild(col);
    });
});

