using BilaTraining.Application.Features.Exercises.Commands.CreateExercise;
using BilaTraining.Application.Features.Exercises.Commands.DeleteExercise;
using BilaTraining.Application.Features.Exercises.Commands.UpdateExercise;
using BilaTraining.Application.Features.Exercises.Dtos;
using BilaTraining.Application.Features.Exercises.Queries.GetExerciseById;
using BilaTraining.Application.Features.Exercises.Queries.GetExercises;
using BilaTraining.Application.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ExercisesController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public ExercisesController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ExerciseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExerciseDto>>> GetAll(CancellationToken ct)
    {
        var exercises = await _dispatcher.Send(new GetExercisesQuery(), ct);
        return Ok(exercises);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ExerciseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseDto>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var exercise = await _dispatcher.Send(new GetExerciseByIdQuery(id), ct);
            return Ok(exercise);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(ExerciseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExerciseDto>> Create(CreateExerciseRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _dispatcher.Send(
                new CreateExerciseCommand(request.Name, request.Category, request.Notes),
                ct);

            var exercise = await _dispatcher.Send(new GetExerciseByIdQuery(id), ct);
            return CreatedAtAction(nameof(GetById), new { id }, exercise);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, UpdateExerciseRequest request, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(
                new UpdateExerciseCommand(id, request.Name, request.Category, request.Notes),
                ct);

            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new DeleteExerciseCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public sealed record CreateExerciseRequest(string Name, string? Category, string? Notes);

    public sealed record UpdateExerciseRequest(string Name, string? Category, string? Notes);
}
