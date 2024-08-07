import emoteCreators from "./emotecreators.json";

console.log(emoteCreators);

const table = document.createElement('table');
document.body.appendChild(table);
const thead = document.createElement('tr');
table.appendChild(thead);
['emote', 'original', 'october', 'december', 'lotr'].forEach((header) => {
    const th = document.createElement('th');
    th.innerText = header;
    thead.appendChild(th);
});

Object.entries(emoteCreators.default).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, creators]) => {
    const row = document.createElement('tr');
    table.appendChild(row);
    [name, creators.createdby, creators.october, creators.december, creators.lotr].forEach((creator) => {
        const col = document.createElement('td');
        col.innerText = creator || '';
        if (!creator) {
            col.classList.add('missing');
        }
        row.appendChild(col);
    });
});

