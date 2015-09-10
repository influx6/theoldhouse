#Commander
  Provides a command pattern which allows a variety of low-level api

##Extensions:

    ->  io:Commander: Provides a commandline interface for io operations because it uses a simple
        command pattern,allows its embeddment into any environment capable of handling the commands
        queries:

          Commands:
            readfile: read out a file to the stdout stream
            writefile: write into a file from the stdin
            appendfile: append into a file from the stdin
            writebyte: write data as bytes from the stdin
            readbytes: read file contents as bytes from the stdin
            makedir: creates a directory
            destroyfile: deletes a file within the current directory
            destroydir: deletes a directory within the current path
            link: symlinks a file or directory within the directory to another
            unlink: removes a file or directory symlink from the current path
            listdir: read out a directory listings into stdout
            readdir: read out a directory returning a map of both relative and absolute paths 

    ->  installer:Commander: Provides a commandline interface to install a file in the systems bin directory

          Commands:
            install: installs a valid dart file as a commandline executable
            uninstall: removes the file from the runnable list
            install-zord: installs the commander executable file
            uninstall-zord: uninstalls the commander executable file

    ->  platform:Commander: Provides a commandline interface to unix/windows platform command

          Commands:
            chmod: unix command to change the permissions of a file/directory
