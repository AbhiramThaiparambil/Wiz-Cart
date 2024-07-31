

// let arr=['1','2','4','2','3','2','2','23',]

// let output=parseInt(arr.join(''))






// let  a=[
//     {class:a,mark:10},
//     {class:b,mark:10},
//     {class:d,mark:10},
//     {class:a,mark:10},
// ]


// let ab=[10,20,30,4]

// let ba=[10,60,30,7]

// 60 20 4 7 




// for(let i=0;i<12;i++){
//     setTimeout(( )=>{
//             console.log( i )
//      },1000*i) 
// }

// for(var i=0;i<12;i++){
//     setTimeout(( )=>{
//             console.log( i )
//      },1000*i)
// }


const currentDate = new Date();
const formattedDate = currentDate.toLocaleDateString('en-GB').split('/').reverse().join('-');
console.log(formattedDate); // Output: 29-07-2024 (if today's date is 29th July 2024)
