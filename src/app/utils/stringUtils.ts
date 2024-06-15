
export const retrievePossibleCombination = (name: string, tags: any) => {
    const regex = /[^\p{L}\p{N}]+/u;
    const nameArray = name.split(regex);
    const array1 = [], array2 = [];

    for (let i = 0; i < nameArray.length; i++) {
        for (let j = i + 1; j <= nameArray.length; j++) {
            const subArray = nameArray.slice(i, j);
            if (subArray.length > 1 && subArray.length < 50) {
                array1.push(subArray.join(" "));
            }
        }
    }

    for (let element of nameArray) {
        let cut = element.replace(/[()]/g, '')
        if (cut.length > 2) {
            array2.push(cut.toLowerCase())
        }
    }
    
    for (let element of array1) {
        let temp = element.split(" ");
        let cut = temp[0].replace(/[()]/g, '')
        if (cut.length > 2) {
            array2.push(cut.toLowerCase())
        }
    }

    let possibleCombiationFromNameArray = Array.from(new Set(array2)).map((title: any) => {
        return title.toLowerCase().charAt(0).toUpperCase() + title.slice(1)
    })

    if (possibleCombiationFromNameArray.length > 30) {
        possibleCombiationFromNameArray = possibleCombiationFromNameArray.slice(0, 30)
    }

    let possibleCombiationFromTagsArray = tags.map((element: any) => {
        return element.split(' ')
            .map((word: String) => word.toLowerCase().charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    })

    return removeDuplicates(possibleCombiationFromNameArray.concat(possibleCombiationFromTagsArray));

}

export const removeDuplicates = (array: any) => {
    const seen = new Set();
    return array.filter((item: any) => {
        if (!seen.has(item)) {
            seen.add(item);
            return true;
        }
        return false;
    });
}