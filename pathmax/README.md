Pathmax
=======

  a low-level url pattern library

##Installation

    npm install -g pathmax
    
##API

  **Pathmax: [Function]**
    
    Arguments: pattern, config
    pattern: the url pattern to use eg. /users/:id/comments/:user_id
    config: a set of configuration options for the pattern
    eg. {
       exactMatch: true | false, -> lets you decide if its must be a strict match or not
       noQuery: true | false, -> ensure either to allow urls to have querystrings or fail if they do when this is true
       lockHash: true | false, -> incase a hash pattern is giving as part of the route,ensure the request url has the same location of hashtag '#'
       params:{
          //define the params and their type for validation eg
          id: 'digits', -> ensure the id param is a numver
          name: 'text' -> ensure its a string,can contain both numbers,letters and symbols
        },
        validators:{
          //define custom validators or rewrite the normal ones
          digits: function(f){
            return typeof f === 'number';
          }
        }
      }
    
  
  **Pathmax.validate**
  
    Arguments: url, object
      url: a url pattern to match against
    Returns: true | false
  
  
  **Pathmax.collect**
    
    Arguments: url
      url: a url to match against
    Returns: Map({}) -> a meta map contain information with param values and extra details on the validation process
    e.g {
      state: true | false, -> if it passed or not
      params: {}, -> contains the parameters of the url
      pattern: url pattern, -> the url pattern used to match against,passed into the pathmax function
      meta: {}, -> extra meta details of the pattern,url and breakdown
      config:{}, -> config map passed into pathmax function
      url: url, -> the url that was validated
    }
  
  
##Example

    var mx = require('pathmax');

    var books = mx('/books/:id/bookStore#:title?name=alex&age=16',{
      'lockHash': true,
      'noQuery': true,
      'params':{
        'id':'digits',
        'title': 'text'
      }
    });

    var q1 = '/books/34/bookStore/boxers';
    var q2 = '/books/23/bookStore/slave2?name=alex&age=20';
  
    books.validate(q1); -> matches the pattern
    books.validate(q2); -> does not match,has it has a query string attached
  
    var meta = books.collect(q1); // returns a object with meta information
